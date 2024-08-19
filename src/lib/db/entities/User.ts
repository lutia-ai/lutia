import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', unique: true })
    email!: string;

    @Column({ type: 'varchar' })
    name!: string;

    @Column({ type: 'varchar', nullable: true })
    password_hash?: string;

    @Column({ type: 'varchar', nullable: true })
    oauth?: string;
}
