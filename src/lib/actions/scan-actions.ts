'use server';

import { getDbPool } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { ValidatedProduct } from '@/lib/definitions';


interface ValidationResult {
  success: boolean;
  message: string;
  product?: ValidatedProduct;
}

export async function validateBarcode(barcode: string, scanType: 'entry' | 'exit'): Promise<ValidationResult> {
    if (!barcode) {
        return { success: false, message: 'Código de barras não fornecido.' };
    }

    const pool = getDbPool();
    try {
        const [productRows] = await pool.query<RowDataPacket[]>(
          `SELECT p.name, p.image_url, p.system_id, b.barcode 
           FROM products p 
           JOIN barcodes b ON p.id = b.product_id 
           WHERE b.barcode = ?`,
          [barcode]
        );

        if (productRows.length === 0) {
          return { success: false, message: `Código de barras "${barcode}" não encontrado.` };
        }
        
        const product = productRows[0];
        let stockLevel = 0;

        if (scanType === 'exit') {
            const [stockLevelRows] = await pool.query<RowDataPacket[]>(
                `SELECT COALESCE(SUM(CASE WHEN type = 'entry' THEN 1 WHEN type = 'exit' THEN -1 ELSE 0 END), 0) as stock_level
                 FROM scans
                 WHERE barcode = ?`,
                [barcode]
            );
            stockLevel = Number(stockLevelRows[0]?.stock_level) || 0;
        }

        return {
            success: true,
            message: 'Produto validado.',
            product: {
                name: product.name,
                imageUrl: product.image_url,
                systemId: product.system_id,
                barcode: product.barcode,
                stockLevel: stockLevel,
            }
        };

    } catch (error) {
        console.error('Erro de banco de dados ao validar código de barras:', error);
        return { success: false, message: 'Erro no banco de dados durante a validação.' };
    }
}


interface ScanResult {
  success: boolean;
  message: string;
  productName?: string;
  scannedAt?: string;
  barcode?: string;
  imageUrl?: string | null;
  systemId?: string;
  soundEnabled?: boolean;
}

export async function logScan(
  prevState: any,
  formData: FormData
): Promise<ScanResult> {
  const barcode = formData.get('barcode') as string;
  const scanType = formData.get('scanType') as 'entry' | 'exit';
  const soundEnabled = formData.get('soundEnabled') === 'true';
  const quantity = parseInt(formData.get('quantity') as string, 10);

  if (!barcode || !scanType) {
    return { success: false, message: 'Código de barras ou tipo de leitura inválido.', soundEnabled };
  }

  if (isNaN(quantity) || quantity < 1) {
    return { success: false, message: 'Quantidade inválida.', soundEnabled };
  }
  
  const pool = getDbPool();
  let connection: PoolConnection | undefined;

  try {
    connection = await pool.getConnection();

    const [productRows] = await connection.query<RowDataPacket[]>(
      `SELECT p.name, p.image_url, p.system_id, b.barcode FROM products p 
       JOIN barcodes b ON p.id = b.product_id 
       WHERE b.barcode = ?`,
      [barcode]
    );

    if (productRows.length === 0) {
      return { success: false, message: `Código de barras "${barcode}" não encontrado.`, barcode, soundEnabled };
    }

    const product = productRows[0];
    const scannedAt = new Date();
    
    if (scanType === 'exit') {
        const [stockLevelRows] = await connection.query<RowDataPacket[]>(
            `SELECT COALESCE(SUM(CASE WHEN type = 'entry' THEN 1 WHEN type = 'exit' THEN -1 ELSE 0 END), 0) as stock_level
             FROM scans
             WHERE barcode = ?`,
            [barcode]
        );

        const stockLevel = stockLevelRows[0]?.stock_level || 0;

        if (stockLevel < quantity) {
            return {
                success: false,
                message: `Estoque insuficiente para o produto "${product.name}". Em estoque: ${stockLevel}, Saída solicitada: ${quantity}.`,
                barcode,
                soundEnabled,
            };
        }
    }

    await connection.beginTransaction();

    const scanValues = [];
    for (let i = 0; i < quantity; i++) {
        scanValues.push([barcode, scanType, scannedAt]);
    }

    await connection.query(
      'INSERT INTO scans (barcode, type, scanned_at) VALUES ?',
      [scanValues]
    );
    
    await connection.commit();

    revalidatePath('/');
    revalidatePath('/saida');
    revalidatePath('/relatorio');

    return {
      success: true,
      message: `${quantity} unidade(s) do produto "${product.name}" registrada(s) com sucesso.`,
      productName: product.name,
      scannedAt: scannedAt.toISOString(),
      barcode: product.barcode,
      imageUrl: product.image_url,
      systemId: product.system_id,
      soundEnabled,
    };
  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Erro de banco de dados:', error);
    return { success: false, message: 'Erro de banco de dados. Verifique o console.', soundEnabled };
  } finally {
    if (connection) connection.release();
  }
}

export async function getRecentScans(scanType: 'entry' | 'exit') {
  const pool = getDbPool();
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT s.barcode, p.name as product_name, p.image_url, p.system_id, s.scanned_at
       FROM scans s
       JOIN barcodes b ON s.barcode = b.barcode
       JOIN products p ON b.product_id = p.id
       WHERE s.type = ?
       ORDER BY s.scanned_at DESC
       LIMIT 10`,
      [scanType]
    );
    return rows.map(row => ({
      ...row,
      scanned_at: new Date(row.scanned_at).toISOString(),
    }));
  } catch (error) {
    console.error('Erro de banco de dados ao buscar leituras recentes:', error);
    return [];
  }
}

    