import React, {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export interface CreatePostData {
  content: string;
  image?: File;
}

export interface CreatePostBoxProps {
  /** Controlled post content. Omit this prop to use the component uncontrolled. */
  value?: string;
  /** Initial content for an uncontrolled composer. */
  defaultValue?: string;
  placeholder?: string;
  avatarUrl?: string;
  userName?: string;
  image?: File;
  onChange?: (value: string) => void;
  onImageChange?: (image?: File) => void;
  onSubmit?: (post: CreatePostData) => void;
  className?: string;
  /** When true, the text area is read-only (e.g. Media Creator role). */
  textReadOnly?: boolean;
  /** When true, image upload controls are hidden (e.g. Content Creator role). */
  hideImageControls?: boolean;
  /** When true, the submit button is hidden (the role hands off elsewhere). */
  hideSubmit?: boolean;
  /** Custom label for the submit button. */
  submitLabel?: string;
  /** When provided, shows a "from library" button in the media asset row. */
  onBrowseLibrary?: () => void;
  /** When provided, shows a video-upload button in the media asset row. */
  onVideoSelect?: (file: File) => void;
  /** True while a video is uploading (disables the button). */
  videoUploading?: boolean;
}

const emojis = ['😀', '😂', '😍', '🎉', '👍', '❤️'];

const CreatePostBox: React.FC<CreatePostBoxProps> = ({
  value,
  defaultValue = '',
  placeholder = "Bạn đang nghĩ gì?",
  avatarUrl,
  userName = 'You',
  image,
  onChange,
  onImageChange,
  onSubmit,
  className = '',
  textReadOnly = false,
  hideImageControls = false,
  hideSubmit = false,
  submitLabel = "Post",
  onBrowseLibrary,
  onVideoSelect,
  videoUploading = false,
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [internalImage, setInternalImage] = useState<File>();
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const contentInputRef = useRef<HTMLTextAreaElement>(null);
  const content = value ?? internalValue;
  const selectedImage = onImageChange ? image : internalImage;
  const initials = userName.trim().charAt(0).toUpperCase() || 'Y';

  // Compute the object URL during render instead of setState-in-effect.
  const imagePreview = useMemo(() => {
    if (!selectedImage) return undefined;
    return URL.createObjectURL(selectedImage);
  }, [selectedImage]);

  // Only cleanup here — no setState, so no render cascade.
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  useEffect(() => {
    const contentInput = contentInputRef.current;
    if (!contentInput) return;

    contentInput.style.height = 'auto';
    contentInput.style.height = `${contentInput.scrollHeight}px`;
  }, [content]);

  const updateContent = (nextValue: string) => {
    if (value === undefined) setInternalValue(nextValue);
    onChange?.(nextValue);
  };

  const setSelectedImage = (nextImage?: File) => {
    if (onImageChange) onImageChange(nextImage);
    else setInternalImage(nextImage);
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedImage(event.target.files?.[0]);
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setSelectedImage(event.dataTransfer.files?.[0]);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!content.trim() && !selectedImage) return;

    onSubmit?.({ content: content.trim(), image: selectedImage });
    if (value === undefined) setInternalValue('');
    setSelectedImage(undefined);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const addEmoji = (emoji: string) => {
    updateContent(`${content}${emoji}`);
    setIsEmojiPickerOpen(false);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-800 ${className}`}
    >
      <div className="flex items-start gap-3 border-b border-slate-200 pb-3 dark:border-neutral-700">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={`${userName}'s avatar`}
            className="h-10 w-10 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div
            aria-label={`${userName}'s avatar`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-white"
          >
            {initials}
          </div>
        )}
        <textarea
          ref={contentInputRef}
          suppressHydrationWarning
          value={content}
          onChange={(event) => updateContent(event.target.value)}
          placeholder={placeholder}
          aria-label="Post content"
          rows={2}
          readOnly={textReadOnly}
          style={{ overflowY: 'hidden' }}
          className={`min-h-10 flex-1 resize-none rounded-lg px-4 py-2.5 text-sm outline-none transition placeholder:text-slate-500 dark:placeholder:text-neutral-300 ${textReadOnly ? "cursor-default bg-slate-50 text-slate-600 dark:bg-neutral-800 dark:text-neutral-300" : "bg-slate-100 text-slate-900 focus:ring-2 focus:ring-primary/30 dark:bg-neutral-700 dark:text-white"}`}
        />
      </div>

      {imagePreview && (
        <div className="relative mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-neutral-600">
          <img
            src={imagePreview}
            alt="Selected post attachment"
            className="max-h-64 w-full object-cover"
          />
          <button
            type="button"
            onClick={() => setSelectedImage(undefined)}
            aria-label="Remove selected image"
            className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-sm text-white hover:bg-black/75"
          >
            ×
          </button>
        </div>
      )}

      <div className="relative mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
          {!hideImageControls && (
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              aria-label="Add an image"
              className="rounded-full p-2 text-green-600 hover:bg-slate-100 dark:hover:bg-neutral-700"
            >
              <span aria-hidden="true">🖼️</span>
            </button>
          )}
          {!textReadOnly && (
            <button
              type="button"
              onClick={() => setIsEmojiPickerOpen((isOpen) => !isOpen)}
              aria-label="Add an emoji"
              aria-expanded={isEmojiPickerOpen}
              className="rounded-full p-2 text-yellow-500 hover:bg-slate-100 dark:hover:bg-neutral-700"
            >
              <span aria-hidden="true">😊</span>
            </button>
          )}
          {isEmojiPickerOpen && !textReadOnly && (
            <div className="absolute bottom-11 left-0 flex gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:border-neutral-600 dark:bg-neutral-700">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => addEmoji(emoji)}
                  aria-label={`Add ${emoji}`}
                  className="rounded p-1 text-lg hover:bg-slate-100 dark:hover:bg-neutral-600"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        {!hideSubmit && (
          <button
            type="submit"
            disabled={!content.trim() && !selectedImage}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitLabel}
          </button>
        )}
      </div>
      {!hideImageControls && (
        <div className="mt-3 flex gap-2">
          <label onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/80 px-3 py-2.5 text-xs text-slate-500 transition hover:border-primary hover:bg-slate-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700">
            <span aria-hidden="true">🖼️</span><span><strong className="text-slate-700 dark:text-white">Media asset</strong> · drop an image here or click to browse</span><input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
          </label>
          {onBrowseLibrary && (
            <button
              type="button"
              onClick={onBrowseLibrary}
              title="Lấy ảnh từ thư viện dùng chung"
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:border-primary hover:text-primary dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
            >
              📚 Thư viện
            </button>
          )}
          {onVideoSelect && (
            <label
              title="Upload video (lưu trên Vercel Blob)"
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:border-primary hover:text-primary dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 ${videoUploading ? "pointer-events-none opacity-50" : ""}`}
            >
              🎬 {videoUploading ? "Đang tải…" : "Video"}
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm,video/x-m4v"
                className="hidden"
                disabled={videoUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) onVideoSelect(file);
                }}
              />
            </label>
          )}
        </div>
      )}
    </form>
  );
};

export default CreatePostBox;
