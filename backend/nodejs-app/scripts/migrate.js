const { sequelize } = require("../config/database");
const { setupAssociations } = require("../models");
const path = require("path");
const fs = require("fs");

async function runMigrations() {
    try {
        // Ensure database connection is established
        await sequelize.authenticate();
        console.log("Database connection established for migrations.");

        // Setup associations before syncing
        setupAssociations();

        // Sync all models with the database
        // { alter: true } will attempt to change the existing tables to match the models
        // { force: true } will drop existing tables and recreate them (use with caution!)
        await sequelize.sync({ alter: true }); 
        console.log("All models were synchronized successfully.");

        // Removed raw SQL migration part as Sequelize handles schema creation
        // const migrationsDir = path.join(__dirname, "../../../database/migrations");
        // const migrationFiles = fs.readdirSync(migrationsDir).sort();

        // for (const file of migrationFiles) {
        //     if (file.endsWith(".sql")) {
        //         const filePath = path.join(migrationsDir, file);
        //         const sql = fs.readFileSync(filePath, "utf8");
        //         console.log(`Running migration: ${file}`);
        //         await sequelize.query(sql);
        //         console.log(`Migration ${file} completed.`);
        //     }
        // }

        console.log("Database migrations completed successfully.");
    } catch (error) {
        console.error("Error during database migration:", error);
        process.exit(1);
    }
}

if (require.main === module) {
    runMigrations();
}

module.exports = runMigrations;


