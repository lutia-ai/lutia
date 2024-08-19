import { AppDataSource } from '$lib/db/database';

async function createTables() {
    try {
        // Initialize the connection
        await AppDataSource.initialize();

        // This will ensure the table is created based on the entity
        await AppDataSource.synchronize();

        console.log('Tables has been created successfully');

    } catch (error) {
        console.error('Error creating user tables:', error);
    } finally {
        // Close the connection
        await AppDataSource.destroy();
    }
}

// Run the function
createTables();