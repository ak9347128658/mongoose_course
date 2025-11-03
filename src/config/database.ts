import mongoose from "mongoose";
import dotenv from 'dotenv';

dotenv.config();

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if(!DatabaseConnection.instance){
        DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void>{
    if(this.isConnected){
        console.log("Database already connected");
        return;
    }
    try{
      const connectionString =  "mongodb://localhost:27017/mongoose-course";
     
      await mongoose.connect(connectionString, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45 * 1000,
        family: 4,
        retryWrites: true,
        w: 'majority'
      })

      this.isConnected = true;
      console.log(`Connected to MongoDB: ${mongoose.connection.name}`);

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        console.log(`MongoDb connection error :`,error)
        this.isConnected = false;
      })

     mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
        this.isConnected = false;
      });

      // Gracefull shutdown
      process.on('SIGINT', async () => {
        await this.disconnect();
        process.exit(0);
      })
    }catch(error){
       console.error(`Database connection failed : `,error);
    }
  }

  public async disconnect(): Promise<void> {
    if(!this.isConnected) return;
    await mongoose.connection.close();
    this.isConnected = false;
    console.log(`Database connection closed`);
  }

  public getConnectionStatus(): boolean{
    return this.isConnected && mongoose.connection.readyState === 1;
  }
}