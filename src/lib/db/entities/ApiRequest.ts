import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { User } from '$lib/db/entities/User';
import { Message } from '$lib/db/entities/Message';
import { modelDictionary } from '$lib/modelDictionary';

// Transform the union type into a TypeScript enum for ApiModel
// First, create a helper function to build an enum object
function createEnumFromUnion<T extends string>(arr: T[]): Record<T, T> {
	return arr.reduce(
		(acc, cur) => {
			acc[cur] = cur;
			return acc;
		},
		{} as Record<T, T>
	);
}

// Extract model params and convert them into a list
const modelParams = Object.values(modelDictionary).flatMap((provider) =>
	Object.values(provider.models).map((model: any) => model.name)
);

// Create the ApiProviderEnum from the keys
export const ApiProvider: Record<any, any> = createEnumFromUnion(Object.keys(modelDictionary));

// Create the ApiModelEnum from the model parameters
export const ApiModel: Record<any, any> = createEnumFromUnion(modelParams);

console.log(ApiProvider, ApiModel);

@Entity()
export class ApiRequest {
	@PrimaryGeneratedColumn()
	id!: number;

	@ManyToOne(() => User, (user) => user.requests, { onDelete: 'CASCADE' })
	@JoinColumn({ name: 'user_id' })
	user!: User;

	@Column({
		type: 'enum',
		enum: ApiProvider
	})
	apiProvider!: typeof ApiProvider;

	@Column({
		type: 'enum',
		enum: ApiModel
	})
	apiModel!: typeof ApiModel;

	@Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
	requestTimestamp!: Date;

	@Column({ type: 'int' })
	inputTokens!: number;

	@Column({ type: 'decimal', precision: 15, scale: 10 })
	inputCost!: number;

	@Column({ type: 'int' })
	outputTokens!: number;

	@Column({ type: 'decimal', precision: 15, scale: 10 })
	outputCost!: number;

	@Column({ type: 'decimal', precision: 15, scale: 10 })
	totalCost!: number;

	// Link to Message entity
	@OneToOne(() => Message, { cascade: true, nullable: true })
	@JoinColumn({ name: 'message_id' })
	message?: Message;
}
