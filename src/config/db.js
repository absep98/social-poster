const mongoose = require('mongoose');
require("dotenv").config();
//connect to database
const connectDB = async () => {
    try{
        const conn = await mongoose.connect(process.env.DB_CONNECTION)
        console.log(`MongoDB Connected : ${conn.connection.host}`);
    }catch(err){
        console.error(err);
        process.exit(1)
    }
}

module.exports = connectDB;