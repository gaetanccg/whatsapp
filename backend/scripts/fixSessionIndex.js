/**
 * Script de réparation des indices sur la collection sessions.
 * Problème observé : un index unique sur `refreshToken` a été créé dans la collection
 * mais le schéma actuel ne définit pas ce champ. Plusieurs documents sans
 * `refreshToken` contiennent `null` et provoquent une erreur E11000 lors de l'insertion.
 *
 * Options :
 *  - drop : supprimer complètement l'index `refreshToken_1` (par défaut recommandé)
 *  - sparse : recréer l'index comme unique + sparse (ignore les documents sans champ)
 *
 * Usage :
 *  node backend/scripts/fixSessionIndex.js [drop|sparse]
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Charger .env comme dans config/db.js
let envPath = path.resolve(process.cwd(), 'backend', '.env');
if (!fs.existsSync(envPath)) {
    envPath = path.resolve(process.cwd(), '.env');
}

dotenv.config({path: envPath});

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test';
const mode = process.argv[2] || 'drop';

async function run() {
    const client = await mongoose.connect(uri, {serverSelectionTimeoutMS: 5000});
    const db = mongoose.connection.db;
    const coll = db.collection('sessions');

    try {
        const indexes = await coll.indexes();
        console.log('Indexes existants sur sessions:', indexes);

        const idx = indexes.find(i => i.key && i.key.refreshToken === 1);
        if (!idx) {
            console.log('Aucun index refreshToken_1 trouvé. Rien à faire.');
            process.exit(0);
        }

        console.log('Index refreshToken trouvé:', idx);

        if (mode === 'drop') {
            console.log('Suppression de l\'index refreshToken_1...');
            await coll.dropIndex('refreshToken_1');
            console.log('Index supprimé.');
        } else if (mode === 'sparse') {
            console.log('Remplacement de l\'index par un index unique sparse...');
            await coll.dropIndex('refreshToken_1');
            await coll.createIndex({refreshToken: 1}, {
                unique: true,
                sparse: true,
                name: 'refreshToken_1'
            });
            console.log('Index recréé en mode unique+sparse.');
        } else {
            console.error('Mode inconnu:', mode);
            process.exit(2);
        }

        console.log('Opération terminée.');
    } catch (err) {
        console.error('Erreur pendant la réparation:', err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

run();

