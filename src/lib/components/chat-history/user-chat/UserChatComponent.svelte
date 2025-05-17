<script lang="ts">
	import type { UserChat } from "$lib/types/types";
	import { getFileIcon, getFileIconColor } from "$lib/utils/fileHandling";


    export let chat: UserChat;
    export let openImageViewer: (image: string, alt: string) => void;
    export let openFileViewer: (file: string, filename: string) => void;

</script>

<div class="user-chat-wrapper">
    {#if chat.attachments && chat.attachments.length > 0}
        <div class="user-images">
            {#each chat.attachments.filter((att) => att.type === 'image') as image}
                <div
                    class="user-image-container"
                    on:click={() =>
                        openImageViewer(
                            image.data,
                            'User uploaded image'
                        )}
                    on:keydown={(e) =>
                        e.key === 'Enter' &&
                        openImageViewer(
                            image.data,
                            'User uploaded image'
                        )}
                    role="button"
                    tabindex="0"
                >
                    <img src={image.data} alt="User uploaded" />
                </div>
            {/each}
            {#each chat.attachments.filter((att) => att.type === 'file') as file}
                <div
                    class="user-file-container"
                    role="button"
                    tabindex="0"
                    on:click={() =>
                        openFileViewer(file.data, file.filename)}
                    on:keydown={(e) =>
                        e.key === 'Enter' &&
                        openFileViewer(file.data, file.filename)}
                >
                    <div class="file-info">
                        <div
                            class="file-icon"
                            style="background: {getFileIconColor(
                                file.file_extension
                            )}"
                        >
                            <span class="file-type"
                                >{getFileIcon(
                                    file.file_extension
                                )}</span
                            >
                        </div>
                        <span class="file-name">{file.filename}</span>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
    <div class="user-chat">
        <p>
            {@html chat.text}
        </p>
    </div>
</div>

<style lang="scss">
    .user-chat-wrapper {
        display: flex;
        flex-direction: column;
        gap: 5px;
        width: 100%;
        max-width: 850px;
        margin-left: auto;
        margin-right: auto;

        .user-images {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            max-width: 500px;
            width: 100%;
            margin-left: auto;

            .user-image-container {
                position: relative;
                flex: 0 0 auto;
                border-radius: 12px;
                overflow: hidden;
                max-width: 200px;
                max-height: 200px;
                width: 100%;
                margin-left: auto;
                cursor: pointer;
                transition:
                    transform 0.2s ease,
                    box-shadow 0.2s ease;

                &:only-child {
                    grid-column: 2;
                }

                &:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
                }

                img {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    object-fit: contain;
                }
            }

            .user-file-container {
                position: relative;
                display: inline-flex;
                margin-right: 10px;
                margin-left: auto;
                margin-bottom: 10px;
                margin-top: auto;
                border-radius: 8px;
                padding: 8px 12px;
                background-color: rgba(29, 96, 194, 0.08);
                border: 1px solid rgba(29, 96, 194, 0.2);
                max-width: 200px;
                max-height: max-content;
                width: 100%;
                align-items: center;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
                transition:
                    transform 0.2s ease,
                    box-shadow 0.2s ease;
                overflow: hidden;
                cursor: pointer;

                &:after {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(
                        to bottom,
                        rgba(255, 255, 255, 0.05),
                        transparent
                    );
                    pointer-events: none;
                }

                &:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 3px 5px rgba(0, 0, 0, 0.08);
                }

                .file-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;

                    .file-icon {
                        width: 28px;
                        height: 28px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 5px;
                        background: linear-gradient(135deg, #1d60c2, #3a7bd5);
                        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);

                        .file-type {
                            font-size: 10px;
                            font-weight: bold;
                            color: white;
                            letter-spacing: 0.5px;
                        }
                    }

                    .file-name {
                        font-size: 13px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        // max-width: 100px;
                        color: var(--text-color);
                    }
                }
            }
        }

        .user-chat {
            position: relative;
            max-width: 500px;
            border-radius: 20px;
            background: var(--bg-color-light);
            padding: 10px 20px;
            width: max-content;
            flex-shrink: 1;
            box-sizing: border-box;
            word-break: break-word;
            overflow-wrap: break-word;
            margin-left: auto;

            p {
                padding: 0;
                margin: 0;
                font-weight: 300;
                line-height: 30px;
            }
        }
    }

    @media (max-width: 810px) {
        .user-chat-wrapper {
            margin-top: 20px !important;
            .user-chat {
                max-width: 100%;
            }
        }
    }
</style>