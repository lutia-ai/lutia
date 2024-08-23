import { Entity, PrimaryGeneratedColumn, Column, ManyToMany, JoinTable } from 'typeorm';
import type { Image } from '$lib/types';

@Entity()
export class Message {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'text' })
	prompt!: string;

	@Column({ type: 'text' })
	response!: string;

	@Column('json', { nullable: true })
	pictures?: Image[];

	@ManyToMany(() => Message, { cascade: true })
	@JoinTable({
		name: 'message_references',
		joinColumn: { name: 'message_id', referencedColumnName: 'id' },
		inverseJoinColumn: { name: 'referenced_message_id', referencedColumnName: 'id' }
	})
	referencedMessages!: Message[]; // References to other messages
}
