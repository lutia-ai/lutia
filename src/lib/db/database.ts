import { DataSource } from 'typeorm';
import { User } from '$lib/db/entities/User';
import { ApiRequest } from '$lib/db/entities/ApiRequest';
import { Message } from '$lib/db/entities/Message';
import dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
	type: 'postgres',
	host: process.env.DB_HOST,
	port: parseInt(process.env.DB_PORT || '5432', 10),
	username: process.env.DB_USERNAME,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	entities: [User, ApiRequest, Message],
	synchronize: true,
	logging: false
});

let databaseInitialized = false;
let initializationPromise: Promise<void> | null = null;

export async function initializeDatabase() {
	if (!initializationPromise) {
		initializationPromise = (async () => {
			if (!databaseInitialized) {
				try {
					await AppDataSource.initialize();
					databaseInitialized = true;
					console.log('Data Source has been initialized!');
				} catch (error) {
					console.error('Error during Data Source initialization:', error);
					initializationPromise = null;
					throw error;
				}
			}
		})();
	}
	return initializationPromise;
}
