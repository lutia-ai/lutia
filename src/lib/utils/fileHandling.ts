import type { FileAttachment, Image } from '$lib/types';
import type { ActionResult } from '@sveltejs/kit';
import { deserialize } from '$app/forms';

// Function to extract text content from file
export async function extractFileContent(file: File): Promise<string> {
	const fileType = file.type;
	const extension = file.name.split('.').pop()?.toLowerCase() || '';

	// Plain text files
	if (
		fileType.includes('text/') ||
		['txt', 'md', 'csv', 'json', 'xml', 'yaml', 'yml'].includes(extension)
	) {
		return await file.text();
	}
	// Code files
	else if (
		[
			'js',
			'ts',
			'jsx',
			'tsx',
			'py',
			'java',
			'c',
			'cpp',
			'cs',
			'go',
			'rb',
			'php',
			'swift',
			'kt',
			'html',
			'css',
			'scss',
			'sass'
		].includes(extension)
	) {
		return await file.text();
	}
	// PDF files
	else if (fileType === 'application/pdf' || extension === 'pdf') {
		// For PDFs, we'll use the server-side extraction
		try {
			// Create a FormData object and append the file
			const formData = new FormData();
			formData.append('file', file);

			// Send the file to the server for processing
			const response = await fetch('/chat/new?/extractPdfText', {
				method: 'POST',
				body: formData
			});

			const result: ActionResult = deserialize(await response.text());

			if (result.type === 'success' && result.data) {
				return result.data.extractedText;
			} else if (result.type === 'failure' && result.data) {
				throw new Error(result.data.message || 'PDF extraction failed');
			}
		} catch (error) {
			console.error('Error extracting PDF text:', error);
			return `[Error extracting text from PDF: ${file.name}]`;
		}
	}
	// Office documents
	else if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
		// For Office docs, we'll use the server-side extraction
		try {
			// Create a FormData object and append the file
			const formData = new FormData();
			formData.append('file', file);

			// Send the file to the server for processing
			const response = await fetch('/chat/new?/extractOfficeText', {
				method: 'POST',
				body: formData
			});

			const result: ActionResult = deserialize(await response.text());

			if (result.type === 'success' && result.data) {
				return result.data.extractedText;
			} else if (result.type === 'failure' && result.data) {
				throw new Error(result.data.message || 'Office document extraction failed');
			}
		} catch (error) {
			console.error('Error extracting Office document text:', error);
			return `[Error extracting text from ${file.name}]`;
		}
	}
	// Default case
	else {
		return `[Unable to extract text from ${file.name}]`;
	}

	// This ensures all code paths return a value
	return `[No text extracted from ${file.name}]`;
}

// Function to get file icon based on extension
export function getFileIcon(fileExtension: string): string {
	if (fileExtension === 'pdf') {
		return 'PDF';
	} else if (
		[
			'py',
			'js',
			'html',
			'css',
			'ts',
			'java',
			'c',
			'cpp',
			'cs',
			'go',
			'rb',
			'php',
			'swift',
			'kt',
			'md',
			'txt',
			'json',
			'yml',
			'yaml',
			'xml',
			'svg',
			'doc',
			'docx',
			'xls',
			'xlsx',
			'ppt',
			'pptx'
		].includes(fileExtension)
	) {
		return fileExtension.toUpperCase();
	} else {
		return 'DOC';
	}
}

// Function to get file icon color based on extension
export function getFileIconColor(fileExtension: string): string {
	// Code files
	if (['py', 'ipynb'].includes(fileExtension)) {
		return 'linear-gradient(135deg, #3572A5, #2b5b84)'; // Python blue
	} else if (['js', 'ts', 'jsx', 'tsx', 'svelte'].includes(fileExtension)) {
		return 'linear-gradient(135deg, #f1e05a, #d4b82c)'; // JavaScript yellow
	} else if (['html', 'css', 'svg'].includes(fileExtension)) {
		return 'linear-gradient(135deg, #e34c26, #b73c1d)'; // HTML/CSS orange-red
	} else if (['java', 'kt'].includes(fileExtension)) {
		return 'linear-gradient(135deg, #b07219, #936311)'; // Java brown
	} else if (['c', 'cpp', 'h', 'hpp'].includes(fileExtension)) {
		return 'linear-gradient(135deg, #555555, #333333)'; // C/C++ gray
	} else if (['cs'].includes(fileExtension)) {
		return 'linear-gradient(135deg, #178600, #126d00)'; // C# green
	} else if (['go'].includes(fileExtension)) {
		return 'linear-gradient(135deg, #00ADD8, #0082a3)'; // Go cyan
	} else if (['rs'].includes(fileExtension)) {
		return 'linear-gradient(135deg, #dea584, #c77b5b)'; // Rust orange
	}
	// Document files
	else if (['pdf'].includes(fileExtension)) {
		return 'linear-gradient(135deg, #e74c3c, #c0392b)'; // PDF red
	} else if (['md', 'txt'].includes(fileExtension)) {
		return 'linear-gradient(135deg, #083fa1, #052b70)'; // Text/Markdown blue
	} else if (['json', 'yml', 'yaml', 'xml'].includes(fileExtension)) {
		return 'linear-gradient(135deg, #4B0082, #32005a)'; // Data files purple
	} else if (['php'].includes(fileExtension)) {
		return 'linear-gradient(135deg, #4F5D95, #3c477a)'; // PHP purple-blue
	} else if (['rb'].includes(fileExtension)) {
		return 'linear-gradient(135deg, #701516, #5b0f10)'; // Ruby dark red
	} else if (['swift'].includes(fileExtension)) {
		return 'linear-gradient(135deg, #ffac45, #e69422)'; // Swift orange
	}
	// Default
	else {
		return 'linear-gradient(135deg, #1d60c2, #3a7bd5)'; // Default blue
	}
}

/**
 * Handles file selection from input or drag events
 * @param event The file input or drop event
 * @param onComplete Callback function that receives the processed files and previews
 * @param showNotification Function to display notifications
 */
export function processFileSelect(
	event: Event | any,
	onComplete: (newPreviews: Image[], newAttachments: FileAttachment[]) => void,
	showNotification: (
		title: string,
		message: string,
		duration: number,
		type: 'info' | 'success'
	) => void
): void {
	let files;
	const isDragging = event.type === 'drop';

	if (isDragging) {
		files = event.dataTransfer.files;
	} else {
		const target = event.target as HTMLInputElement;
		files = target.files;
	}

	if (files && files.length > 0) {
		const newPreviews: Image[] = [];
		const newAttachments: FileAttachment[] = [];
		let processedFiles = 0;
		let largeImageResized = false;

		for (const file of files) {
			// Image handling
			if (file.type.startsWith('image/')) {
				const reader = new FileReader();
				// Check if file is too large (2MB limit)
				const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB in bytes

				if (file.size > MAX_FILE_SIZE) {
					// File is too large, we'll need to resize it
					largeImageResized = true;
					resizeImage(file, (resizedBlob) => {
						const resizedReader = new FileReader();
						resizedReader.onload = (e: ProgressEvent<FileReader>) => {
							if (e.target?.result) {
								const img = new Image();
								img.onload = () => {
									newPreviews.push({
										type: 'image',
										data: e.target!.result as string,
										media_type: 'image/jpeg', // Resized to JPEG
										width: img.width,
										height: img.height
									});

									processedFiles++;
									// If all files have been processed, update the arrays
									if (processedFiles === files.length) {
										onComplete(newPreviews, newAttachments);

										// Show notification only if at least one image was resized
										if (largeImageResized) {
											showNotification(
												'Image resized',
												'Large image(s) were automatically resized to stay under the 2MB limit',
												5000,
												'info'
											);
										}
									}
								};
								img.src = e.target.result as string;
							}
						};
						resizedReader.readAsDataURL(resizedBlob);
					});
				} else {
					// File is within size limits, process normally
					reader.onload = (e: ProgressEvent<FileReader>) => {
						if (e.target?.result) {
							const img = new Image();
							img.onload = () => {
								newPreviews.push({
									type: 'image',
									data: e.target!.result as string,
									media_type: file.type,
									width: img.width,
									height: img.height
								});

								processedFiles++;
								// If all files have been processed, update the arrays
								if (processedFiles === files.length) {
									onComplete(newPreviews, newAttachments);

									// Show notification only if at least one image was resized
									if (largeImageResized) {
										showNotification(
											'Image resized',
											'Large image(s) were automatically resized to stay under the 2MB limit',
											5000,
											'info'
										);
									}
								}
							};
							img.src = e.target.result as string;
						}
					};
					reader.readAsDataURL(file);
				}
			} else {
				// Handle non-image files (PDFs, code, text)
				const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB limit for files
				if (file.size > MAX_FILE_SIZE) {
					showNotification('File too large', 'Files must be under 5MB', 5000, 'info');
					processedFiles++;
					continue;
				}

				// Extract text from file instead of reading as base64
				extractFileContent(file)
					.then((extractedText) => {
						// Get file extension
						const filename = file.name;
						const lastDot = filename.lastIndexOf('.');
						const file_extension = lastDot > 0 ? filename.substring(lastDot + 1) : '';

						newAttachments.push({
							type: 'file',
							data: extractedText, // Use extracted text instead of base64 data
							media_type: file.type || 'application/octet-stream',
							filename: file.name,
							file_extension,
							size: file.size
						});

						processedFiles++;
						// If all files have been processed, update the arrays
						if (processedFiles === files.length) {
							onComplete(newPreviews, newAttachments);

							// Show notification only if at least one image was resized
							if (largeImageResized) {
								showNotification(
									'Image resized',
									'Large image(s) were automatically resized to stay under the 2MB limit',
									5000,
									'info'
								);
							}
						}
					})
					.catch((error) => {
						console.error(`Error extracting text from ${file.name}:`, error);

						// Still add the file with an error message
						const filename = file.name;
						const lastDot = filename.lastIndexOf('.');
						const file_extension = lastDot > 0 ? filename.substring(lastDot + 1) : '';

						newAttachments.push({
							type: 'file',
							data: `[Error extracting text from ${file.name}]`,
							media_type: file.type || 'application/octet-stream',
							filename: file.name,
							file_extension,
							size: file.size
						});

						processedFiles++;
						if (processedFiles === files.length) {
							onComplete(newPreviews, newAttachments);

							if (largeImageResized) {
								showNotification(
									'Image resized',
									'Large image(s) were automatically resized to stay under the 2MB limit',
									5000,
									'info'
								);
							}
						}
					});
			}
		}
	}
}

/**
 * Resizes an image to stay under the size limit
 * @param file The image file to resize
 * @param callback Function to call with the resized blob
 */
export function resizeImage(file: File, callback: (blob: Blob) => void): void {
	const reader = new FileReader();
	reader.onload = (e) => {
		if (e.target?.result) {
			const img = new Image();
			img.onload = () => {
				// Create a canvas to resize the image
				const canvas = document.createElement('canvas');
				let { width, height } = img;

				// Calculate the new dimensions while maintaining aspect ratio
				// Start with the original dimensions and step down until size is acceptable
				let quality = 0.7; // Initial JPEG quality

				const scaleAndCheck = (scaleFactor: number) => {
					const newWidth = width * scaleFactor;
					const newHeight = height * scaleFactor;

					canvas.width = newWidth;
					canvas.height = newHeight;

					const ctx = canvas.getContext('2d');
					if (ctx) {
						ctx.drawImage(img, 0, 0, newWidth, newHeight);
						canvas.toBlob(
							(result) => {
								if (result) {
									if (result.size <= 2 * 1024 * 1024 || scaleFactor < 0.1) {
										// Either we're under the limit or we've scaled down too much
										callback(result);
									} else {
										// Still too big, scale down further
										scaleAndCheck(scaleFactor * 0.8);
									}
								}
							},
							'image/jpeg',
							quality
						);
					}
				};

				// Start with 80% of original size
				scaleAndCheck(0.8);
			};
			img.src = e.target.result as string;
		}
	};
	reader.readAsDataURL(file);
}

/**
 * Scrolls to ensure the cursor is visible in the viewport
 * Designed to be used after pasting or editing when cursor is already positioned
 * @param element The contentEditable element containing the cursor
 */
export function scrollCursorIntoView(element: HTMLElement): void {
	if (!element) return;

	// Get the current selection
	const selection = window.getSelection();
	if (!selection || selection.rangeCount === 0) return;

	// Get the current range (where the cursor is)
	const range = selection.getRangeAt(0);

	setTimeout(() => {
		// Get cursor position
		const rects = range.getClientRects();
		if (rects.length > 0) {
			const cursorRect = rects[rects.length - 1];

			// Calculate how much to scroll to position cursor at a good position
			// Add a buffer (50px) from the top for better visibility
			const scrollAmount = cursorRect.top - 50;

			// Scroll the element to position cursor
			if (element.scrollHeight > element.clientHeight) {
				// If element itself is scrollable
				element.scrollTop += scrollAmount;
			} else if (
				element.parentElement &&
				element.parentElement.scrollHeight > element.parentElement.clientHeight
			) {
				// If parent is scrollable
				element.parentElement.scrollTop += scrollAmount;
			} else {
				// Fallback to window scroll
				window.scrollBy(0, scrollAmount);
			}
		}
	}, 10); // Slight delay to ensure DOM is fully updated
}

// Keep backward compatibility with the old function name
export function focusAtEnd(element: HTMLElement): void {
	return scrollCursorIntoView(element);
}
