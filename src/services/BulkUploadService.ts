import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';

export interface BulkUploadRow {
    email: string;
    full_name: string;
    role: string;
    [key: string]: any;
}

export interface BulkUploadResult {
    email: string;
    password?: string;
    userId?: string; // Add this
    status: 'success' | 'error';
    message?: string;
}

export class BulkUploadService {
    /**
     * Parse an Excel or CSV file into an array of objects
     */
    static async parseExcel(file: File): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                resolve(jsonData);
            };
            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Generate password as Name + Year of Birth
     */
    static generatePassword(name: string, dob?: string): string {
        const cleanName = name.replace(/\s+/g, '').toLowerCase();
        let year = '2000';
        if (dob) {
            const date = new Date(dob);
            if (!isNaN(date.getFullYear())) {
                year = date.getFullYear().toString();
            } else if (dob.includes('-')) {
                year = dob.split('-')[0];
            } else if (dob.includes('/')) {
                year = dob.split('/').pop() || '2000';
            }
        }
        return `${cleanName}${year}`;
    }

    /**
     * Bulk create users via a Supabase Edge Function (Optimized with chunks)
     */
    static async bulkCreateUsers(users: BulkUploadRow[], institutionId: string, onProgress?: (current: number, total: number) => void): Promise<BulkUploadResult[]> {
        const results: BulkUploadResult[] = [];
        const CHUNK_SIZE = 5; // Process 5 users at a time

        for (let i = 0; i < users.length; i += CHUNK_SIZE) {
            const chunk = users.slice(i, i + CHUNK_SIZE);
            const chunkPromises = chunk.map(async (user) => {
                const password = this.generatePassword(user.full_name || user.name, user.dob);
                try {
                    const { data, error } = await supabase.functions.invoke('create-user', {
                        body: {
                            email: user.email,
                            password: password,
                            role: user.role,
                            full_name: user.full_name || user.name,
                            institution_id: institutionId
                        }
                    });

                    if (error) throw error;

                    return {
                        email: user.email,
                        password: password,
                        userId: data?.user?.id,
                        status: 'success'
                    } as BulkUploadResult;
                } catch (error: any) {
                    console.error(`Error creating user ${user.email}:`, error);
                    return {
                        email: user.email,
                        status: 'error',
                        message: error.message
                    } as BulkUploadResult;
                }
            });

            const chunkResults = await Promise.all(chunkPromises);
            results.push(...chunkResults);

            if (onProgress) {
                onProgress(Math.min(i + CHUNK_SIZE, users.length), users.length);
            }
        }

        return results;
    }

    /**
     * Download results as an Excel file
     */
    static downloadResults(results: BulkUploadResult[], filename: string) {
        const worksheet = XLSX.utils.json_to_sheet(results);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Credentials");
        XLSX.writeFile(workbook, filename);
    }

    /**
     * Generate and download a template file
     */
    static generateTemplate(type: 'student' | 'staff') {
        let headers: any[] = [];
        let filename = '';

        if (type === 'student') {
            headers = [{
                name: 'John Doe',
                register_number: 'STU001',
                class_name: '10',
                section: 'A',
                dob: '2008-05-15',
                gender: 'male',
                parent_name: 'Richard Doe',
                parent_contact: '1234567890',
                email: 'john.doe@example.com',
                address: '123 School St'
            }];
            filename = 'student-template.xlsx';
        } else {
            headers = [{
                name: 'Jane Smith',
                staff_id: 'STAFF001',
                email: 'jane.smith@example.com',
                phone: '9876543210',
                role: 'teacher',
                subject_assigned: 'Mathematics',
                class_assigned: '10',
                section_assigned: 'A',
                dob: '1985-10-20'
            }];
            filename = 'staff-template.xlsx';
        }

        const worksheet = XLSX.utils.json_to_sheet(headers);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
        XLSX.writeFile(workbook, filename);
    }
}
