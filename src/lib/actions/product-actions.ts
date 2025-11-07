'use server';

import { getDbPool } from "@/lib/db";
import type { Product } from "@/lib/definitions";
import { revalidatePath } from "next/cache";
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';

interface AddProductData {
  name: string;
  systemId: string;
  barcodes: { value: string }[];
}

interface ProductFormValues extends AddProductData {
    id?: number;
}

interface ProductActionResult {
  success: boolean;
  message?: string;
  product?: Product;
}

export async function addProduct(data: AddProductData): Promise<ProductActionResult> {
  const pool = getDbPool();
  let connection: PoolConnection | undefined;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Check for existing systemId or barcodes
    const existingBarcodes = data.barcodes.map(b => b.value).filter(b => b);
    if (existingBarcodes.length > 0) {
        const [existingRows] = await connection.query<RowDataPacket[]>(
            `SELECT
                (SELECT COUNT(*) FROM products WHERE system_id = ?) as systemIdCount,
                (SELECT COUNT(*) FROM barcodes WHERE barcode IN (?)) as barcodeCount`,
            [data.systemId, [existingBarcodes]]
        );

        if (existingRows[0].systemIdCount > 0) {
            await connection.rollback();
            return { success: false, message: 'Código do sistema já existe.' };
        }
        if (existingRows[0].barcodeCount > 0) {
            await connection.rollback();
            return { success: false, message: 'Um ou mais códigos de barras já existem.' };
        }
    } else {
         const [existingRows] = await connection.query<RowDataPacket[]>(
            `SELECT COUNT(*) as systemIdCount FROM products WHERE system_id = ?`,
            [data.systemId]
        );
        if (existingRows[0].systemIdCount > 0) {
            await connection.rollback();
            return { success: false, message: 'Código do sistema já existe.' };
        }
    }


    const [productResult] = await connection.query<any>(
      'INSERT INTO products (name, system_id) VALUES (?, ?)',
      [data.name, data.systemId]
    );
    const productId = productResult.insertId;

    if (existingBarcodes.length > 0) {
        const barcodeValues = data.barcodes.map(b => [productId, b.value]);
        await connection.query(
          'INSERT INTO barcodes (product_id, barcode) VALUES ?',
          [barcodeValues]
        );
    }

    await connection.commit();
    
    revalidatePath('/produtos');

    const newProduct: Product = {
        id: productId,
        name: data.name,
        system_id: data.systemId,
        barcodes: data.barcodes.map(b => b.value),
        sql_server_id: null,
        image_id: null,
        image_url: null,
    };

    return { success: true, product: newProduct };

  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error("Erro de banco de dados em addProduct:", error);
    if (error.code === 'ER_DUP_ENTRY') {
      return { success: false, message: 'Código do sistema ou código de barras já existe.' };
    }
    return { success: false, message: 'Erro no banco de dados ao adicionar produto.' };
  } finally {
    if (connection) connection.release();
  }
}

export async function updateProduct(data: ProductFormValues): Promise<ProductActionResult> {
    const { id, name, systemId, barcodes } = data;

    if (!id) {
        return { success: false, message: 'ID do produto não fornecido.' };
    }

    const pool = getDbPool();
    let connection: PoolConnection | undefined;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        
        // Check for duplicate systemId
        const [existingSystemId] = await connection.query<RowDataPacket[]>(
            'SELECT id FROM products WHERE system_id = ? AND id != ?',
            [systemId, id]
        );
        if (existingSystemId.length > 0) {
            await connection.rollback();
            return { success: false, message: 'Esse código de sistema já está em uso por outro produto.' };
        }
        
        // Check for duplicate barcodes
        const barcodeValues = barcodes.map(b => b.value).filter(Boolean);
        if (barcodeValues.length > 0) {
            const [existingBarcodes] = await connection.query<RowDataPacket[]>(
                'SELECT barcode FROM barcodes WHERE barcode IN (?) AND product_id != ?',
                [barcodeValues, id]
            );
            if (existingBarcodes.length > 0) {
                await connection.rollback();
                return { success: false, message: `Os seguintes códigos de barras já estão em uso: ${existingBarcodes.map(b => b.barcode).join(', ')}` };
            }
        }

        // Update product details
        await connection.query(
            'UPDATE products SET name = ?, system_id = ? WHERE id = ?',
            [name, systemId, id]
        );

        // Get current barcodes for the product
        const [currentDbBarcodes] = await connection.query<RowDataPacket[]>(
            'SELECT barcode FROM barcodes WHERE product_id = ?',
            [id]
        );
        const currentBarcodeSet = new Set(currentDbBarcodes.map(b => b.barcode));
        const newBarcodeSet = new Set(barcodeValues);

        // Determine which barcodes to add and which to remove
        const barcodesToAdd = barcodeValues.filter(b => !currentBarcodeSet.has(b));
        const barcodesToRemove = [...currentBarcodeSet].filter(b => !newBarcodeSet.has(b));

        // Remove old barcodes
        if (barcodesToRemove.length > 0) {
            await connection.query(
                'DELETE FROM barcodes WHERE product_id = ? AND barcode IN (?)',
                [id, barcodesToRemove]
            );
        }

        // Add new barcodes
        if (barcodesToAdd.length > 0) {
            const newBarcodeInsertValues = barcodesToAdd.map(b => [id, b]);
            await connection.query(
                'INSERT INTO barcodes (product_id, barcode) VALUES ?',
                [newBarcodeInsertValues]
            );
        }

        await connection.commit();
        
        revalidatePath('/produtos');
        revalidatePath(`/produtos?page=${Math.ceil(id / 10)}`);


        const updatedProduct: Product = {
            id,
            name,
            system_id: systemId,
            barcodes: barcodeValues,
            sql_server_id: null, // Assuming these are not updated via this form
            image_id: null,
            image_url: null,
        };

        return { success: true, product: updatedProduct };
    } catch (error: any) {
        if (connection) await connection.rollback();
        console.error("Erro de banco de dados em updateProduct:", error);
        return { success: false, message: 'Erro no banco de dados ao atualizar o produto.' };
    } finally {
        if (connection) connection.release();
    }
}


interface GetProductsParams {
  page?: number;
  limit?: number;
  query?: string;
}

interface GetProductsResult {
  products: Product[];
  totalPages: number;
  totalProducts: number;
  absoluteTotal: number;
}

export async function getProducts({ page = 1, limit = 10, query = '' }: GetProductsParams = {}): Promise<GetProductsResult> {
  const pool = getDbPool();
  const offset = (page - 1) * limit;
  const searchQuery = `%${query}%`;
  
  const whereClause = query
    ? `WHERE p.name LIKE ? OR p.system_id LIKE ? OR b.barcode LIKE ?`
    : '';
  const queryParams = query ? [searchQuery, searchQuery, searchQuery] : [];

  try {
     const [[{ absoluteTotal }]] = await pool.query<RowDataPacket[]>(
        `SELECT COUNT(*) as absoluteTotal FROM products`
    );

    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      LEFT JOIN barcodes b ON p.id = b.product_id
      ${whereClause}
    `;
    const [[{ total }]] = await pool.query<RowDataPacket[]>(countQuery, queryParams);
    const totalPages = Math.ceil(total / limit) || 1;

    const productsQuery = `
       SELECT p.id, p.name, p.system_id, p.sql_server_id, p.image_id, p.image_url,
              (SELECT JSON_ARRAYAGG(b_inner.barcode) FROM barcodes b_inner WHERE b_inner.product_id = p.id) as barcodes
       FROM products p
       LEFT JOIN barcodes b ON p.id = b.product_id
       ${whereClause}
       GROUP BY p.id
       ORDER BY p.name ASC
       LIMIT ? OFFSET ?
    `;

    const [rows] = await pool.query<RowDataPacket[]>(productsQuery, [...queryParams, limit, offset]);

    const products = rows.map(row => ({
      ...row,
      id: row.id,
      barcodes: row.barcodes || [],
      image_url: row.image_url,
    })) as Product[];

    return { products, totalPages, totalProducts: total, absoluteTotal };
    
  } catch (error: any) {
    console.error("Erro de banco de dados em getProducts:", error);
     if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('image_url')) {
        console.warn('Coluna `image_url` não encontrada, buscando produtos sem ela.');
        const [[{ absoluteTotal }]] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) as absoluteTotal FROM products`);

        // Fallback queries without image_url
        const fallbackCountQuery = `
            SELECT COUNT(DISTINCT p.id) as total
            FROM products p
            LEFT JOIN barcodes b ON p.id = b.product_id
            ${whereClause}
        `;
        const [[{ total }]] = await pool.query<RowDataPacket[]>(fallbackCountQuery, queryParams);
        const totalPages = Math.ceil(total / limit) || 1;

        const fallbackProductsQuery = `
           SELECT p.id, p.name, p.system_id, p.sql_server_id, p.image_id,
                  (SELECT JSON_ARRAYAGG(b_inner.barcode) FROM barcodes b_inner WHERE b_inner.product_id = p.id) as barcodes
           FROM products p
           LEFT JOIN barcodes b ON p.id = b.product_id
           ${whereClause}
           GROUP BY p.id
           ORDER BY p.name ASC
           LIMIT ? OFFSET ?
        `;
        const [rows] = await pool.query<RowDataPacket[]>(fallbackProductsQuery, [...queryParams, limit, offset]);

        const products = rows.map(row => ({
          ...row,
          id: row.id,
          barcodes: row.barcodes || [],
          image_url: null, // Always return null if column is missing
        })) as Product[];
        return { products, totalPages, totalProducts: total, absoluteTotal };
    }
    return { products: [], totalPages: 1, totalProducts: 0, absoluteTotal: 0 };
  }
}

interface BulkAddProductsResult {
    success: boolean;
    message: string;
    insertedCount: number;
    updatedCount: number;
    skippedCount: number;
}

export async function bulkAddProducts(records: any[]): Promise<BulkAddProductsResult> {
    if (!records || records.length === 0) {
        return { success: false, message: 'Nenhum registro para processar.', insertedCount: 0, updatedCount: 0, skippedCount: 0 };
    }

    const pool = getDbPool();
    let connection: PoolConnection | undefined;
    
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        let insertedCount = 0;
        let updatedCount = 0;
        let skippedCount = 0;

        for (const record of records) {
            const nome = record.nome || record.name;
            const código = record.código || record.codigo || record.code;
            const id_produto = record.id_produto || record.id_sql;
            const id_imagem = record.id_imagem || record.id_foto;

            if (!id_produto) {
                console.warn('Ignorando linha por falta de id_produto:', record);
                skippedCount++;
                continue;
            }
            
            const [existingProduct] = await connection.query<RowDataPacket[]>(
                'SELECT id, system_id FROM products WHERE sql_server_id = ?', 
                [id_produto]
            );

            if (existingProduct.length > 0) {
                const productId = existingProduct[0].id;
                if (código && código !== existingProduct[0].system_id) {
                    const [conflictCheck] = await connection.query<RowDataPacket[]>(
                        'SELECT id FROM products WHERE system_id = ? AND id != ?',
                        [código, productId]
                    );

                    if (conflictCheck.length > 0) {
                        skippedCount++;
                        continue;
                    }
                }

                await connection.query(
                    'UPDATE products SET name = ?, system_id = ?, image_id = ? WHERE id = ?',
                    [nome || null, código || null, id_imagem || null, productId]
                );
                updatedCount++;
            } else {
                if (!nome || !código) {
                    skippedCount++;
                    continue;
                }
                
                const [duplicateSystemId] = await connection.query<RowDataPacket[]>(
                    'SELECT id FROM products WHERE system_id = ?',
                    [código]
                );

                if (duplicateSystemId.length > 0) {
                    skippedCount++;
                    continue;
                }

                await connection.query<any>(
                    'INSERT INTO products (name, system_id, sql_server_id, image_id) VALUES (?, ?, ?, ?)',
                    [nome, código, id_produto, id_imagem || null]
                );
                insertedCount++;
            }
        }

        await connection.commit();
        revalidatePath('/produtos');

        return { success: true, message: 'Chunk processado.', insertedCount, updatedCount, skippedCount };

    } catch (error: any) {
        if (connection) await connection.rollback();
        console.error("Erro de banco de dados em bulkAddProducts:", error);
        return { success: false, message: `Erro no banco de dados: ${error.message}`, insertedCount: 0, updatedCount: 0, skippedCount: records.length };
    } finally {
        if (connection) connection.release();
    }
}

interface BulkAddBarcodesResult {
    success: boolean;
    message: string;
    insertedCount: number;
    skippedCount: number;
}

export async function bulkAddBarcodes(records: any[]): Promise<BulkAddBarcodesResult> {
    if (!records || records.length === 0) {
        return { success: false, message: 'Nenhum registro para processar.', insertedCount: 0, skippedCount: 0 };
    }

    const pool = getDbPool();
    let connection: PoolConnection | undefined;

    try {
        connection = await pool.getConnection();
        
        let insertedCount = 0;
        let skippedCount = 0;
        const newBarcodes: { product_id: number; barcode: string }[] = [];

        // Fetch all product IDs first to reduce queries inside loop
        const allSqlServerIds = records.map(r => r.id_produto || r.id_sql).filter(id => id);
        const [products] = await connection.query<RowDataPacket[]>(
            'SELECT id, sql_server_id FROM products WHERE sql_server_id IN (?)',
            [allSqlServerIds]
        );
        const sqlIdToProductIdMap = new Map(products.map(p => [p.sql_server_id, p.id]));

        for (const record of records) {
            const id_produto = record.id_produto || record.id_sql;
            const codigo_barras = record.codigo_barras || record.barcode;

            if (!id_produto || !codigo_barras) {
                skippedCount++;
                continue;
            }

            const productId = sqlIdToProductIdMap.get(id_produto);
            if (!productId) {
                skippedCount++;
                continue;
            }

            newBarcodes.push({ product_id: productId, barcode: codigo_barras });
        }
        
        if (newBarcodes.length > 0) {
            await connection.beginTransaction();

            const existingBarcodesResult = await connection.query<RowDataPacket[]>(
                'SELECT barcode FROM barcodes WHERE barcode IN (?)',
                [newBarcodes.map(b => b.barcode)]
            );
            const existingBarcodes = new Set(existingBarcodesResult[0].map(row => row.barcode));
            
            const barcodesToInsert = newBarcodes
                .filter(b => !existingBarcodes.has(b.barcode))
                .map(b => [b.product_id, b.barcode]);

            if (barcodesToInsert.length > 0) {
                 const result = await connection.query<any>(
                    'INSERT IGNORE INTO barcodes (product_id, barcode) VALUES ?',
                    [barcodesToInsert]
                );
                insertedCount = result[0].affectedRows;
            }
            skippedCount += newBarcodes.length - insertedCount;
            
            await connection.commit();
        }

        revalidatePath('/produtos');

        return { success: true, message: 'Chunk processado.', insertedCount, skippedCount };

    } catch (error: any) {
        if (connection && connection.connection.config.transaction) await connection.rollback();
        console.error("Erro de banco de dados em bulkAddBarcodes:", error);
        return { success: false, message: `Erro no banco de dados: ${error.message}`, insertedCount: 0, skippedCount: records.length };
    } finally {
        if (connection) connection.release();
    }
}


interface BulkAddImagesResult {
    success: boolean;
    message: string;
    updatedCount: number;
    skippedCount: number;
}

export async function bulkAddImages(records: any[]): Promise<BulkAddImagesResult> {
    if (!records || records.length === 0) {
        return { success: false, message: 'Nenhum registro para processar.', updatedCount: 0, skippedCount: 0 };
    }

    const pool = getDbPool();
    let connection: PoolConnection | undefined;

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        let totalUpdatedCount = 0;
        let totalSkippedCount = 0;

        for (const record of records) {
            const id_imagem = record.id_imagem || record.id_foto;
            const link_imagem_original = record.link_imagem_original || record.image_url;

            if (!id_imagem || !link_imagem_original) {
                totalSkippedCount++;
                continue;
            }

            const [result] = await connection.query<any>(
                'UPDATE products SET image_url = ? WHERE image_id = ?',
                [link_imagem_original, id_imagem]
            );
            
            // affectedRows is the number of rows that were actually updated.
            // foundRows (which needs a client flag) is the number of rows matched.
            // If a row matched but wasn't updated because the value was the same, affectedRows is 0.
            if (result.affectedRows > 0) {
              totalUpdatedCount += result.affectedRows;
            } else if (result.changedRows === 0 && result.affectedRows === 0) {
              // This means a product with the image_id was found, but the URL was already correct.
              // We can count this as a "skip" because no data was changed. Let's find out if it exists.
               const [exists] = await connection.query<RowDataPacket[]>(
                    'SELECT 1 FROM products WHERE image_id = ?',
                    [id_imagem]
                );
                if (exists.length > 0) {
                    totalSkippedCount++;
                } else {
                    totalSkippedCount++; // also skip if image_id doesn't exist at all.
                }
            } else {
               totalSkippedCount++;
            }
        }

        await connection.commit();
        revalidatePath('/produtos');
        
        return { success: true, message: 'Chunk processado.', updatedCount: totalUpdatedCount, skippedCount: totalSkippedCount };

    } catch (error: any) {
        if (connection) await connection.rollback();
        console.error("Erro de banco de dados em bulkAddImages:", error);
        if (error.code === 'ER_BAD_FIELD_ERROR' && error.message.includes('image_url')) {
            return { success: false, message: 'A coluna `image_url` não foi encontrada na tabela `products`.', updatedCount: 0, skippedCount: records.length };
        }
        return { success: false, message: `Erro no banco de dados: ${error.message}`, updatedCount: 0, skippedCount: records.length };
    } finally {
        if (connection) connection.release();
    }
}

export async function clearAllProductData(): Promise<{ success: boolean; message: string; }> {
  const pool = getDbPool();
  let connection: PoolConnection | undefined;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Disable foreign key checks to avoid issues with truncation order
    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

    await connection.query('TRUNCATE TABLE scans');
    await connection.query('TRUNCATE TABLE barcodes');
    await connection.query('TRUNCATE TABLE products');
    
    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');

    await connection.commit();
    
    revalidatePath('/produtos');
    revalidatePath('/relatorio');
    revalidatePath('/');
    revalidatePath('/saida');

    return { success: true, message: 'Todos os dados de produtos, códigos de barras e movimentações foram zerados com sucesso.' };
  } catch (error: any) {
    if (connection) await connection.rollback();
    console.error("Erro de banco de dados em clearAllProductData:", error);
    return { success: false, message: 'Erro no banco de dados ao zerar todos os cadastros.' };
  } finally {
    if (connection) connection.release();
  }
}
