import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ApiRequest } from './ApiRequest';

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

	@OneToMany(() => ApiRequest, (request) => request.user)
	requests!: ApiRequest[];
}
