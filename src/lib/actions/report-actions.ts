'use server';

import { getDbPool } from "@/lib/db";
import type { StockSummary, StockSummaryForDisplay } from "@/lib/definitions";
import { revalidatePath } from "next/cache";
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

interface GetStockSummaryParams {
  page?: number;
  limit?: number;
  query?: string;
}

interface GetStockSummaryResult {
  summary: StockSummary[];
  totalPages: number;
}

export async function getStockSummaryForExport(): Promise<GetStockSummaryResult> {
  const pool = getDbPool();
  
  try {
    const dataQuery = `
      SELECT 
          p.name,
          p.system_id,
          b.barcode,
          COALESCE((SELECT SUM(CASE WHEN type = 'entry' THEN 1 WHEN type = 'exit' THEN -1 ELSE 0 END) FROM scans s WHERE s.barcode = b.barcode), 0) as stock_level
      FROM barcodes b
      JOIN products p ON b.product_id = p.id
      ORDER BY p.name, b.barcode;
    `;
    const [rows] = await pool.query<RowDataPacket[]>(dataQuery);
    
    const summary = rows.map(row => ({
      name: row.name,
      system_id: row.system_id,
      barcode: row.barcode,
      stock_level: Number(row.stock_level),
    }));

    // totalPages is not relevant here as we are fetching all data
    return { summary, totalPages: 1 };

  } catch (error) {
    console.error("Erro de banco de dados em getStockSummaryForExport:", error);
    return { summary: [], totalPages: 1 };
  }
}

interface GetStockSummaryForDisplayResult {
  summary: StockSummaryForDisplay[];
  totalPages: number;
  totalProducts: number;
  totalStockItems: number;
}

export async function getStockSummaryForDisplay({ page = 1, limit = 10, query = '' }: GetStockSummaryParams): Promise<GetStockSummaryForDisplayResult> {
  const pool = getDbPool();
  const offset = (page - 1) * limit;
  const searchQuery = `%${query}%`;

  try {
    // Queries for total counts
    const [[{ totalProducts }]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) as totalProducts FROM products");
    const [[{ totalStockItems }]] = await pool.query<RowDataPacket[]>(`
      SELECT COALESCE(SUM(quantity), 0) as totalStockItems FROM (
        SELECT SUM(CASE WHEN type = 'entry' THEN 1 WHEN type = 'exit' THEN -1 ELSE 0 END) as quantity
        FROM scans
        GROUP BY barcode
      ) as stock_counts
    `);

    const subQueryForTotal = `
      SELECT p.id
      FROM products p
      LEFT JOIN barcodes b_join ON p.id = b_join.product_id
      WHERE p.name LIKE ? OR b_join.barcode LIKE ? OR p.system_id LIKE ?
      GROUP BY p.id
      HAVING COALESCE((SELECT SUM(CASE WHEN s.type = 'entry' THEN 1 WHEN s.type = 'exit' THEN -1 ELSE 0 END) FROM scans s JOIN barcodes b_scan ON s.barcode = b_scan.barcode WHERE b_scan.product_id = p.id), 0) > 0
    `;
    
    const totalQuery = `SELECT COUNT(*) as total FROM (${subQueryForTotal}) as sub`;
    
    const [[{ total }]] = await pool.query<RowDataPacket[]>(totalQuery, [searchQuery, searchQuery, searchQuery]);
    const totalPages = Math.ceil(total / limit) || 1;

    const dataQuery = `
      SELECT 
          p.name,
          p.system_id,
          p.image_url,
          (SELECT JSON_ARRAYAGG(b.barcode) FROM barcodes b WHERE b.product_id = p.id) as barcodes,
          COALESCE((SELECT SUM(CASE WHEN s.type = 'entry' THEN 1 WHEN s.type = 'exit' THEN -1 ELSE 0 END) FROM scans s JOIN barcodes b_scan ON s.barcode = b_scan.barcode WHERE b_scan.product_id = p.id), 0) as stock_level
      FROM products p
      LEFT JOIN barcodes b_join ON p.id = b_join.product_id
      WHERE p.name LIKE ? OR b_join.barcode LIKE ? OR p.system_id LIKE ?
      GROUP BY p.id, p.name, p.system_id, p.image_url
      HAVING stock_level > 0
      ORDER BY p.name
      LIMIT ? OFFSET ?;
    `;
    const [rows] = await pool.query<RowDataPacket[]>(dataQuery, [searchQuery, searchQuery, searchQuery, limit, offset]);

    const summary = rows.map(row => ({
      name: row.name,
      system_id: row.system_id,
      barcodes: row.barcodes || [],
      stock_level: Number(row.stock_level),
      image_url: row.image_url,
    }));

    return { summary, totalPages, totalProducts: totalProducts, totalStockItems: Number(totalStockItems) };

  } catch (error: any) {
    console.error("Erro de banco de dados em getStockSummaryForDisplay:", error);
     if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('image_url')) {
        console.warn('Coluna `image_url` não encontrada, buscando resumo sem ela.');
        const [[{ totalProducts }]] = await pool.query<RowDataPacket[]>("SELECT COUNT(*) as totalProducts FROM products");
        const [[{ totalStockItems }]] = await pool.query<RowDataPacket[]>(`
            SELECT COALESCE(SUM(quantity), 0) as totalStockItems FROM (
                SELECT SUM(CASE WHEN type = 'entry' THEN 1 WHEN type = 'exit' THEN -1 ELSE 0 END) as quantity
                FROM scans
                GROUP BY barcode
            ) as stock_counts
        `);
        // Fallback query without image_url
        const fallbackDataQuery = `
          SELECT 
              p.name,
              p.system_id,
              (SELECT JSON_ARRAYAGG(b.barcode) FROM barcodes b WHERE b.product_id = p.id) as barcodes,
              COALESCE((SELECT SUM(CASE WHEN s.type = 'entry' THEN 1 WHEN s.type = 'exit' THEN -1 ELSE 0 END) FROM scans s JOIN barcodes b_scan ON s.barcode = b_scan.barcode WHERE b_scan.product_id = p.id), 0) as stock_level
          FROM products p
          LEFT JOIN barcodes b_join ON p.id = b_join.product_id
          WHERE p.name LIKE ? OR b_join.barcode LIKE ? OR p.system_id LIKE ?
          GROUP BY p.id, p.name, p.system_id
          HAVING stock_level > 0
          ORDER BY p.name
          LIMIT ? OFFSET ?;
        `;
        const [fallbackRows] = await pool.query<RowDataPacket[]>(fallbackDataQuery, [searchQuery, searchQuery, searchQuery, limit, offset]);
        const summary = fallbackRows.map(row => ({
          name: row.name,
          system_id: row.system_id,
          barcodes: row.barcodes || [],
          stock_level: Number(row.stock_level),
          image_url: null,
        }));
        
        const fallbackTotalQuery = `
            SELECT COUNT(*) as total FROM (
              SELECT p.id
              FROM products p
              LEFT JOIN barcodes b_join ON p.id = b_join.product_id
              WHERE p.name LIKE ? OR b_join.barcode LIKE ? OR p.system_id LIKE ?
              GROUP BY p.id
              HAVING COALESCE((SELECT SUM(CASE WHEN s.type = 'entry' THEN 1 WHEN s.type = 'exit' THEN -1 ELSE 0 END) FROM scans s JOIN barcodes b_scan ON s.barcode = b_scan.barcode WHERE b_scan.product_id = p.id), 0) > 0
            ) as sub
        `;
        const [[{ total }]] = await pool.query<RowDataPacket[]>(fallbackTotalQuery, [searchQuery, searchQuery, searchQuery]);
        const totalPages = Math.ceil(total / limit) || 1;

        return { summary, totalPages, totalProducts: totalProducts, totalStockItems: Number(totalStockItems) };
    }
    return { summary: [], totalPages: 1, totalProducts: 0, totalStockItems: 0 };
  }
}


export async function clearScans() {
  const pool = getDbPool();
  try {
    await pool.query('DELETE FROM scans');
    
    revalidatePath('/relatorio');
    revalidatePath('/');
    revalidatePath('/saida');

    return { success: true, message: 'Toda a movimentação foi zerada com sucesso.' };
  } catch (error) {
    console.error("Erro de banco de dados em clearScans:", error);
    return { success: false, message: 'Erro no banco de dados ao zerar a movimentação.' };
  }
}

export async function fixExportErrors(errorHtml: string): Promise<{ success: boolean, message: string }> {
  if (!errorHtml) {
    return { success: false, message: 'Nenhum texto de erro fornecido.' };
  }
  
  const pool = getDbPool();
  let connection: PoolConnection | undefined;

  try {
    // Regex to find "código de barras '...'" and extract the barcode
    const regex = /código de barras '(\d+)'/g;
    const matches = [...errorHtml.matchAll(regex)];
    const barcodesToRemove = matches.map(match => match[1]);

    if (barcodesToRemove.length === 0) {
      return { success: false, message: 'Nenhum código de barras para remover foi encontrado no texto.' };
    }
    
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // First delete scans associated with the barcodes to avoid foreign key constraints
    const [scansResult] = await connection.query<any>(
      'DELETE FROM scans WHERE barcode IN (?)',
      [barcodesToRemove]
    );

    // Then delete the barcodes themselves
    const [barcodesResult] = await connection.query<any>(
      'DELETE FROM barcodes WHERE barcode IN (?)',
      [barcodesToRemove]
    );
    
    await connection.commit();

    revalidatePath('/relatorio');
    revalidatePath('/produtos');
    
    const deletedCount = barcodesResult.affectedRows;
    const deletedScansCount = scansResult.affectedRows;

    return { 
      success: true, 
      message: `${deletedCount} código(s) de barras e ${deletedScansCount} movimentações associadas foram removidos com sucesso. Códigos removidos: ${barcodesToRemove.join(', ')}` 
    };

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error("Erro de banco de dados em fixExportErrors:", error);
    return { success: false, message: `Erro no banco de dados: ${error.message}` };
  } finally {
    if (connection) connection.release();
  }
}
