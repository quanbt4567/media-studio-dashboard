import React, {
  ChangeEvent,
  FormEvent,
  useEffect,
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
}

const emojis = ['😀', '😂', '😍', '🎉', '👍', '❤️'];

const CreatePostBox: React.FC<CreatePostBoxProps> = ({
  value,
  defaultValue = '',
  placeholder = "What's on your mind?",
  avatarUrl,
  userName = 'You',
  image,
  onChange,
  onImageChange,
  onSubmit,
  className = '',
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [internalImage, setInternalImage] = useState<File>();
  const [imagePreview, setImagePreview] = useState<string>();
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const contentInputRef = useRef<HTMLTextAreaElement>(null);
  const content = value ?? internalValue;
  const selectedImage = onImageChange ? image : internalImage;
  const initials = userName.trim().charAt(0).toUpperCase() || 'Y';

  useEffect(() => {
    if (!selectedImage) {
      setImagePreview(undefined);
      return;
    }

    const previewUrl = URL.createObjectURL(selectedImage);
    setImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedImage]);

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
          style={{ overflowY: 'hidden' }}
          className="min-h-10 flex-1 resize-none rounded-lg bg-slate-100 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:ring-2 focus:ring-primary/30 dark:bg-neutral-700 dark:text-white dark:placeholder:text-neutral-300"
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
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            aria-label="Add an image"
            className="rounded-full p-2 text-green-600 hover:bg-slate-100 dark:hover:bg-neutral-700"
          >
            <span aria-hidden="true">🖼️</span>
          </button>
          <button
            type="button"
            onClick={() => setIsEmojiPickerOpen((isOpen) => !isOpen)}
            aria-label="Add an emoji"
            aria-expanded={isEmojiPickerOpen}
            className="rounded-full p-2 text-yellow-500 hover:bg-slate-100 dark:hover:bg-neutral-700"
          >
            <span aria-hidden="true">😊</span>
          </button>
          {isEmojiPickerOpen && (
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
        <button
          type="submit"
          disabled={!content.trim() && !selectedImage}
          className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Post
        </button>
      </div>
      <label onDragOver={(event) => event.preventDefault()} onDrop={handleDrop} className="mt-3 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50/80 px-3 py-2.5 text-xs text-slate-500 transition hover:border-primary hover:bg-slate-100 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700">
        <span aria-hidden="true">🖼️</span><span><strong className="text-slate-700 dark:text-white">Media asset</strong> · drop an image here or click to browse</span><input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
      </label>
    </form>
  );
};

export default CreatePostBox;
