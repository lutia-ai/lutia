function logDetailedError({
	msg,
	userId,
	userEmail,
	requestData,
	error
}: {
	msg: string;
	userId: string;
	userEmail: string;
	requestData: Record<string, any>;
	error: any;
}) {
	console.error(msg, {
		userId,
		userEmail,
		requestData,
		error: error instanceof Error ? error.stack : String(error)
	});
}
