import { DatabaseConnection } from './config/database';
import { UserService } from './services/UserService';
import { UserRole } from './types/user.types';
// https://chatgpt.com/c/69096175-fa20-8323-8a3e-1ecbfb5bfd07
async function main() {
    try {
        const db = DatabaseConnection.getInstance();
        await db.connect();

        // Initialize services
        const userService = new UserService();

        // const newUser = await userService.createUser({
        //   email: 'john.doe@example.com',
        //   username: 'johndoe',
        //   firstName: 'John',
        //   lastName: 'Doe',
        //   password: 'securePassword123',
        //   age: 30,
        //   roles: [UserRole.USER]
        // });    
        // console.log('Created user:', newUser.fullName); // Using virtual    
        // const fetchedUser = await userService.getUserByEmail('john.doe@example.com')
        // console.log('Fetched user:', fetchedUser);

    // Update user
    // const updatedUser = await userService.updateUser('69081f7632343f85003c5fa8', {
    //   age: 31,
    //   firstName: 'Jonathan'
    // });
    // console.log('Updated user:', updatedUser?.fullName);        

    // Get users with pagination
    const usersList = await userService.getUsers({
      page: 1,
      limit: 5,
      isActive: true
    });
    console.log(`Found ${usersList.totalCount} users`);

    } catch (error) {
        console.error(`Application error :`, error);
    }
}

main().catch(console.error);