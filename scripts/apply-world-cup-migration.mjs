#!/usr/bin/env node
/**
 * Affiche le SQL à exécuter dans Supabase → SQL Editor pour activer les tickets CDM.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(
  path.join(__dirname, '../supabase/migrations/20260607120000_world_cup_ticket_code.sql'),
  'utf8'
);

console.log('Collez ce SQL dans Supabase Dashboard → SQL Editor → Run :\n');
console.log(sql);
