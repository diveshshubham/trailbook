"use client";

import { useRef, useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { getPresignedUrl } from "@/lib/trailbookApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";

type StoryEditorProps = {
  value: string;
  onChange: (value: string) => void;
  albumId?: string;
  placeholder?: string;
};

// Common emojis for stories
const EMOJI_CATEGORIES = {
  Nature: ["🏔️", "🌲", "🌊", "🌅", "🌄", "⛰️", "🏕️", "🌿", "🍃", "🌾", "🌺", "🌸", "🌻", "🌷", "🌼"],
  Adventure: ["🚶", "🏃", "🧗", "⛷️", "🏂", "🚴", "🚵", "🎒", "🧭", "🗺️", "📍", "⛺", "🔥", "💪", "🌟"],
  Weather: ["☀️", "⛅", "☁️", "🌧️", "⛈️", "❄️", "🌨️", "🌪️", "🌈", "🌤️"],
  Emotions: ["😊", "😄", "😍", "🥰", "🤩", "😎", "🤗", "🙌", "💯", "✨", "🎉", "🎊"],
  Objects: ["📷", "📸", "🎥", "📱", "💼", "🎒", "🧳", "🕶️", "🧢", "👟"],
};

async function uploadImageToS3(file: File, albumId?: string): Promise<string> {
  if (!albumId) {
    throw new Error("Album ID is required to upload images");
  }

  const presigned = await getPresignedUrl({
    albumId,
    contentType: file.type || "image/jpeg",
  });

  if (!presigned.uploadUrl) {
    throw new Error("Failed to get presigned URL");
  }

  // Upload via proxy
  const formData = new FormData();
  formData.append("uploadUrl", presigned.uploadUrl);
  formData.append("contentType", file.type || "image/jpeg");
  formData.append("file", file);

  const res = await fetch("/api/s3-upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Upload failed: ${text || res.statusText}`);
  }

  // Return the image URL (we'll use the key to construct the URL)
  return presigned.key || presigned.uploadUrl.split("?")[0];
}

export default function StoryEditor({
  value,
  onChange,
  albumId,
  placeholder = "Start writing your story...",
}: StoryEditorProps) {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<keyof typeof EMOJI_CATEGORIES>("Nature");

  // Initialize and sync editor content
  useEffect(() => {
    if (editorRef.current) {
      const currentHTML = editorRef.current.innerHTML;
      const valueHTML = convertToHTML(value || "");
      
      // Only update if content has changed (avoid cursor jumping)
      if (currentHTML !== valueHTML) {
        const selection = window.getSelection();
        const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
        const cursorPosition = range ? range.startOffset : 0;
        
        editorRef.current.innerHTML = valueHTML;
        
        // Restore cursor position if possible
        if (range && editorRef.current.firstChild) {
          try {
            const newRange = document.createRange();
            newRange.setStart(editorRef.current.firstChild, Math.min(cursorPosition, editorRef.current.firstChild.textContent?.length || 0));
            newRange.collapse(true);
            selection?.removeAllRanges();
            selection?.addRange(newRange);
          } catch {
            // Ignore cursor restoration errors
          }
        }
      }
    }
  }, [value]);

  // Convert plain text with image URLs to HTML
  function convertToHTML(text: string): string {
    if (!text) return "";
    
    // Check if it's already HTML
    if (text.includes("<") && text.includes(">")) {
      // Resolve image URLs in existing HTML
      return text.replace(/<img[^>]+src="([^"]+)"[^>]*>/g, (match, url) => {
        const resolvedUrl = resolveMediaUrl(url) || url;
        return match.replace(url, resolvedUrl);
      });
    }

    // Convert image URLs to img tags
    // Pattern: [IMAGE:url] or just detect image URLs
    const imagePattern = /\[IMAGE:(.+?)\]/g;
    let html = text.replace(imagePattern, (match, url) => {
      const resolvedUrl = resolveMediaUrl(url) || url;
      return `<img src="${resolvedUrl}" alt="Story image" style="max-width: 100%; height: auto; border-radius: 12px; margin: 16px 0;" />`;
    });

    // Convert line breaks
    html = html.replace(/\n/g, "<br>");

    return html;
  }

  // Convert HTML back to storage format
  function convertToStorage(html: string): string {
    // Convert img tags back to [IMAGE:url] format
    const imgPattern = /<img[^>]+src="([^"]+)"[^>]*>/g;
    let text = html.replace(imgPattern, (match, url) => {
      return `[IMAGE:${url}]`;
    });

    // Remove other HTML tags but keep content
    const div = document.createElement("div");
    div.innerHTML = text;
    text = div.textContent || div.innerText || "";

    // Restore image markers
    const imageMarkers = html.match(/<img[^>]+src="([^"]+)"[^>]*>/g) || [];
    imageMarkers.forEach((imgTag) => {
      const urlMatch = imgTag.match(/src="([^"]+)"/);
      if (urlMatch) {
        const url = urlMatch[1];
        // Find where to insert the marker (approximate)
        text = text.replace(/\n\n/g, `\n[IMAGE:${url}]\n\n`);
      }
    });

    return html; // Store as HTML for now
  }

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const insertEmoji = (emoji: string) => {
    execCommand("insertText", emoji);
    setShowEmojiPicker(false);
  };

  const handleImageUpload = async (file: File) => {
    if (!albumId) {
      alert("Album ID is required to upload images");
      return;
    }

    setUploadingImage(true);
    try {
      const imageKey = await uploadImageToS3(file, albumId);
      // Store the key, and resolve the URL for display
      const imageUrl = resolveMediaUrl(imageKey) || imageKey;
      const imgTag = `<img src="${imageUrl}" data-key="${imageKey}" alt="Story image" style="max-width: 100%; height: auto; border-radius: 12px; margin: 16px 0; display: block;" />`;
      execCommand("insertHTML", imgTag);
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div 
        className="flex items-center gap-2 p-3 rounded-xl border flex-wrap"
        style={{
          borderColor: "var(--theme-border)",
          backgroundColor: "var(--theme-surface-elevated)",
        }}
      >
        {/* Formatting Buttons */}
        <div className="flex items-center gap-1 border-r pr-2" style={{ borderColor: "var(--theme-border)" }}>
          <button
            type="button"
            onClick={() => execCommand("bold")}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition"
            style={{
              backgroundColor: "var(--theme-surface)",
              color: "var(--theme-text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
              e.currentTarget.style.color = "var(--theme-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--theme-surface)";
              e.currentTarget.style.color = "var(--theme-text-secondary)";
            }}
            title="Bold"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
              <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => execCommand("italic")}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition"
            style={{
              backgroundColor: "var(--theme-surface)",
              color: "var(--theme-text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
              e.currentTarget.style.color = "var(--theme-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--theme-surface)";
              e.currentTarget.style.color = "var(--theme-text-secondary)";
            }}
            title="Italic"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="4" x2="10" y2="4" />
              <line x1="14" y1="20" x2="5" y2="20" />
              <line x1="15" y1="4" x2="9" y2="20" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => execCommand("underline")}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition"
            style={{
              backgroundColor: "var(--theme-surface)",
              color: "var(--theme-text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
              e.currentTarget.style.color = "var(--theme-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--theme-surface)";
              e.currentTarget.style.color = "var(--theme-text-secondary)";
            }}
            title="Underline"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
              <line x1="4" y1="21" x2="20" y2="21" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => execCommand("backColor", "#ffeb3b")}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition"
            style={{
              backgroundColor: "var(--theme-surface)",
              color: "var(--theme-text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
              e.currentTarget.style.color = "var(--theme-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--theme-surface)";
              e.currentTarget.style.color = "var(--theme-text-secondary)";
            }}
            title="Highlight"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l-6 6v3h3l6-6" />
              <path d="M22 12l-4.586 4.586a2 2 0 0 1-2.828 0l-5.172-5.172a2 2 0 0 1 0-2.828L12 4l8 8z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => execCommand("removeFormat")}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition"
            style={{
              backgroundColor: "var(--theme-surface)",
              color: "var(--theme-text-secondary)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
              e.currentTarget.style.color = "var(--theme-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "var(--theme-surface)";
              e.currentTarget.style.color = "var(--theme-text-secondary)";
            }}
            title="Remove formatting"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 7h16" />
              <path d="M5 7l1 12h12l1-12" />
              <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
            </svg>
          </button>
        </div>

        {/* Emoji Button */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="h-8 w-8 rounded-lg flex items-center justify-center transition"
          style={{
            backgroundColor: showEmojiPicker ? "var(--theme-accent)" : "var(--theme-surface)",
            color: showEmojiPicker ? "var(--theme-text-inverse)" : "var(--theme-text-secondary)",
          }}
          onMouseEnter={(e) => {
            if (!showEmojiPicker) {
              e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
              e.currentTarget.style.color = "var(--theme-accent)";
            }
          }}
          onMouseLeave={(e) => {
            if (!showEmojiPicker) {
              e.currentTarget.style.backgroundColor = "var(--theme-surface)";
              e.currentTarget.style.color = "var(--theme-text-secondary)";
            }
          }}
          title="Insert emoji"
        >
          😊
        </button>

        {/* Image Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!albumId || uploadingImage}
          className="h-8 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium transition disabled:opacity-60"
          style={{
            backgroundColor: uploadingImage ? "var(--theme-surface-hover)" : "var(--theme-surface)",
            color: "var(--theme-text-secondary)",
          }}
          onMouseEnter={(e) => {
            if (!uploadingImage && albumId) {
              e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
              e.currentTarget.style.color = "var(--theme-accent)";
            }
          }}
          onMouseLeave={(e) => {
            if (!uploadingImage) {
              e.currentTarget.style.backgroundColor = "var(--theme-surface)";
              e.currentTarget.style.color = "var(--theme-text-secondary)";
            }
          }}
          title={albumId ? "Insert image" : "Album ID required"}
        >
          {uploadingImage ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span>Image</span>
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              handleImageUpload(file);
            }
          }}
        />
      </div>

      {/* Emoji Picker */}
      {showEmojiPicker && (
        <div 
          className="rounded-xl border p-4 shadow-lg"
          style={{
            borderColor: "var(--theme-border)",
            backgroundColor: "var(--theme-surface-elevated)",
          }}
        >
          <div className="flex gap-2 mb-3 flex-wrap">
            {Object.keys(EMOJI_CATEGORIES).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category as keyof typeof EMOJI_CATEGORIES)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition"
                style={{
                  backgroundColor: selectedCategory === category 
                    ? "var(--theme-accent)" 
                    : "var(--theme-surface)",
                  color: selectedCategory === category 
                    ? "var(--theme-text-inverse)" 
                    : "var(--theme-text-secondary)",
                }}
              >
                {category}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-8 gap-2">
            {EMOJI_CATEGORIES[selectedCategory].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="h-10 w-10 rounded-lg flex items-center justify-center text-xl transition hover:scale-110"
                style={{
                  backgroundColor: "var(--theme-surface)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--theme-surface)";
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className="min-h-[300px] rounded-2xl border px-4 py-3 text-sm outline-none transition-colors duration-300"
        style={{
          borderColor: "var(--theme-border)",
          backgroundColor: "var(--theme-surface)",
          color: "var(--theme-text-primary)",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
          fontSize: "15px",
          lineHeight: "1.8",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = isDefault ? "rgba(249, 115, 22, 0.5)" : "var(--theme-accent)";
          e.currentTarget.style.boxShadow = isDefault 
            ? "0 0 0 2px rgba(249, 115, 22, 0.2)" 
            : "0 0 0 2px var(--theme-accent-light)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "var(--theme-border)";
          e.currentTarget.style.boxShadow = "none";
        }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />

      <style jsx>{`
        [contenteditable][data-placeholder]:empty:before {
          content: attr(data-placeholder);
          color: var(--theme-text-tertiary);
          pointer-events: none;
        }
        [contenteditable] img {
          max-width: 100%;
          height: auto;
          border-radius: 12px;
          margin: 16px 0;
          display: block;
        }
        [contenteditable] strong {
          font-weight: 700;
        }
        [contenteditable] em {
          font-style: italic;
        }
        [contenteditable] u {
          text-decoration: underline;
        }
        [contenteditable] mark {
          background-color: #ffeb3b;
          padding: 2px 4px;
          border-radius: 3px;
        }
      `}</style>
    </div>
  );
}
