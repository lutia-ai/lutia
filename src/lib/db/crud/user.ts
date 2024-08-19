import bcrypt from 'bcrypt';
import { AppDataSource } from '../database';
import { Repository } from 'typeorm';
import { User } from '../entities/User';

export async function createUser(userData: Partial<User>): Promise<User> {
    const userRepository: Repository<User> = AppDataSource.getRepository(User);
    const newUser = new User();

    if (!userData.email) {
        throw new Error("Email is required to create a user");
    }

    userData.email = handleGmail(userData.email);

    if (!userData.oauth && userData.password_hash) {
        const saltRounds  = 10;
        userData.password_hash = await bcrypt.hash(userData.password_hash, saltRounds);
    }

    Object.assign(newUser, userData);
    return await userRepository.save(newUser);
}


export async function retrieveUserByEmail(email: string): Promise<User | null> {
    const userRepository: Repository<User> = AppDataSource.getRepository(User);
    email = handleGmail(email);

    return await userRepository.findOne({ where: { email } });
}


function handleGmail(email: string): string {
    // Split the email to get the part after '@' and before the '.'
    const emailParts = email?.split('@');
    const domainParts = emailParts[1]?.split('.');

    if (domainParts[0] === 'googlemail') {
        // Reconstruct the email with 'gmail' instead of 'googlemail'
        email = `${emailParts[0]}@gmail.${domainParts.slice(1).join('.')}`;
    }

    return email;
}