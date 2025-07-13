/**
 * Type for JSON fields in the database
 */
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];