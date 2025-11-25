import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Try to load .env from current working directory (backend/) first,
// otherwise fall back to the monorepo root ../.env so MONGODB_URI is available
let envPath = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
    envPath = path.resolve(process.cwd(), '../.env');
}

dotenv.config({path: envPath});

const connectDB = async() => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // ---- Nouveau : s'assurer qu'aucun index unique `refreshToken` ne bloque
        // les insertions de sessions (cas E11000 quand refreshToken == null).
        // On supprime automatiquement l'index s'il existe pour permettre
        // plusieurs connexions/sessions par appareil.
        try {
            const db = conn.connection.db;
            const collections = await db.listCollections({name: 'sessions'}).toArray();
            if (collections.length > 0) {
                const coll = db.collection('sessions');
                const indexes = await coll.indexes();
                const idx = indexes.find(i => i.key && i.key.refreshToken === 1);
                if (idx) {
                    const idxName = idx.name || 'refreshToken_1';
                    console.log(`Index '${idxName}' trouvé sur sessions -> suppression pour autoriser plusieurs sessions.`);
                    try {
                        await coll.dropIndex(idxName);
                        console.log(`Index '${idxName}' supprimé.`);
                    } catch (dropErr) {
                        console.warn(`Impossible de supprimer l'index '${idxName}':`, dropErr.message);
                    }
                }
            }
        } catch (indexErr) {
            // Ne pas faire planter la connexion si l'opération d'index échoue.
            console.warn('Vérification/suppression des index sessions impossible:', indexErr.message);
        }
        // ---- fin de la vérification d'index

        return conn;
    } catch (error) {
        console.error(`Error: ${error.message}`);
        if (process.env.NODE_ENV !== 'test') {
            process.exit(1);
        }
        throw error;
    }
};

export default connectDB;
