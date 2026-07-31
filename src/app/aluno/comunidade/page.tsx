"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUp,
  Bookmark,
  CheckCircle2,
  Heart,
  Image as ImageIcon,
  Flag,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  PenLine,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { StudentHeader } from "@/app/aluno/_components/StudentHeader";
import { supabaseBrowser } from "@/lib/supabase/browser";

type FeedTab =
  | "para-voce"
  | "seguindo"
  | "avisos"
  | "duvidas"
  | "networking"
  | "lives";

type ProfileUser = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role?: string | null;
};

type CommunityChannel = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_locked: boolean | null;
  is_active: boolean | null;
  sort_order: number | null;
};

type CommunityPost = {
  id: string;
  channel_id: string;
  author_id: string;
  title: string | null;
  body: string;
  image_path: string | null;
  status: string | null;
  is_pinned: boolean | null;
  published_at: string | null;
  allow_comments: boolean | null;
  created_at: string | null;
};

type CommunityComment = {
  id: string;
  post_id: string;
  author_id: string;
  body: string;
  image_path: string | null;
  status: string | null;
  created_at: string | null;
};

type CommunityReaction = {
  id: string;
  post_id: string | null;
  user_id: string;
  reaction_type: string;
};

type CommunitySavedPost = {
  id: string;
  post_id: string;
  user_id: string;
};

type CommunityNotification = {
  id: string;
  title: string | null;
  body: string | null;
  target_type: string | null;
  channel_id: string | null;
  status: string | null;
  created_by: string | null;
  sent_at: string | null;
  created_at: string | null;
};

type FeedComment = {
  id: string;
  author: string;
  initials: string;
  avatarUrl: string;
  body: string;
  imageUrl: string;
  time: string;
};

type FeedPost = {
  id: string;
  tab: FeedTab;
  authorId: string;
  author: string;
  username: string;
  initials: string;
  avatarUrl: string;
  time: string;
  channelId: string;
  channel: string;
  text: string;
  imageUrl: string;
  comments: number;
  likes: number;
  liked: boolean;
  saved: boolean;
  verified?: boolean;
  official?: boolean;
  sourceType?: "post" | "notification";
  notificationId?: string;
  allowComments: boolean;
  commentsList: FeedComment[];
};

type CommunitySettings = {
  allow_student_posts: boolean;
  require_post_approval: boolean;
  allow_student_comments: boolean;
  require_comment_approval: boolean;
  allow_media_uploads: boolean;
  allow_reports: boolean;
  community_rules: string;
};

const defaultCommunitySettings: CommunitySettings = {
  allow_student_posts: true,
  require_post_approval: false,
  allow_student_comments: true,
  require_comment_approval: false,
  allow_media_uploads: true,
  allow_reports: true,
  community_rules: "",
};

const fallbackTabs: Array<{
  id: FeedTab;
  label: string;
  count?: number;
}> = [
  { id: "para-voce", label: "Para você" },
  { id: "seguindo", label: "Seguindo" },
  { id: "avisos", label: "Avisos" },
  { id: "duvidas", label: "Dúvidas" },
  { id: "networking", label: "Networking" },
  { id: "lives", label: "Lives" },
];

function getTabFromSlug(slug: string | null | undefined): FeedTab {
  const cleanSlug = String(slug ?? "").toLowerCase();

  if (cleanSlug.includes("aviso")) return "avisos";
  if (cleanSlug.includes("duvida") || cleanSlug.includes("dúvida")) return "duvidas";
  if (cleanSlug.includes("networking") || cleanSlug.includes("apresent")) return "networking";
  if (cleanSlug.includes("mentoria") || cleanSlug.includes("live") || cleanSlug.includes("ao-vivo")) return "lives";

  return "para-voce";
}

function getInitials(name: string | null | undefined) {
  const cleanName = name?.trim();

  if (!cleanName) return "UL";

  const parts = cleanName.split(/\s+/).filter(Boolean);

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

function slugHandle(name: string | null | undefined) {
  const cleanName = name?.trim() || "aluno";

  return `@${cleanName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "")}`;
}

function resolvePublicUrl(bucket: string, path: string | null | undefined) {
  if (!path) return "";

  const cleanPath = path.trim();

  if (!cleanPath) return "";

  if (
    cleanPath.startsWith("http://") ||
    cleanPath.startsWith("https://") ||
    cleanPath.startsWith("/")
  ) {
    return cleanPath;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  if (!supabaseUrl) return cleanPath;

  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${cleanPath.replace(
    /^\/+/,
    "",
  )}`;
}

function resolveAvatarUrl(url: string | null | undefined) {
  return resolvePublicUrl("avatars", url);
}

function findImageUrl(text: string) {
  return (
    text.match(
      /https?:\/\/[^\s)]+\.(?:png|jpe?g|webp|gif)(?:\?[^\s)]*)?/i,
    )?.[0] ?? ""
  );
}

function getRelativeTime(value: string | null) {
  if (!value) return "agora";

  const date = new Date(value);
  const timestamp = date.getTime();

  if (!Number.isFinite(timestamp)) return "agora";

  const diff = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return "agora";
  if (diff < hour) return `${Math.floor(diff / minute)} min`;
  if (diff < day) return `${Math.floor(diff / hour)} h`;

  const days = Math.floor(diff / day);

  if (days === 1) return "ontem";

  return `${days} dias`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function Avatar({
  initials,
  avatarUrl,
  official,
}: {
  initials: string;
  avatarUrl?: string;
  official?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const imageUrl = avatarUrl && !failed ? avatarUrl : "";

  return (
    <div
      className={`flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-[12px] font-bold ${
        official ? "bg-[#DBC094] text-black" : "bg-white/10 text-white"
      }`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials
      )}
    </div>
  );
}

function TabButton({
  item,
  active,
  onClick,
}: {
  item: {
    id: FeedTab;
    label: string;
    count?: number;
  };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-12 shrink-0 items-center gap-2 px-4 text-[14px] font-semibold transition ${
        active ? "text-white" : "text-white/48 hover:text-white"
      }`}
    >
      {item.label}

      {item.count ? (
        <span
          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
            active ? "bg-[#DBC094] text-black" : "bg-white/10 text-white/58"
          }`}
        >
          {item.count}
        </span>
      ) : null}

      {active ? (
        <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-full bg-[#DBC094]" />
      ) : null}
    </button>
  );
}

function Composer({
  currentUser,
  text,
  channelId,
  channels,
  onTextChange,
  onChannelChange,
  onSubmit,
  publishing,
  image,
  imagePreview,
  allowMedia,
  onImageChange,
  onRemoveImage,
}: {
  currentUser: ProfileUser | null;
  text: string;
  channelId: string;
  channels: CommunityChannel[];
  onTextChange: (value: string) => void;
  onChannelChange: (value: string) => void;
  onSubmit: () => void;
  publishing: boolean;
  image: File | null;
  imagePreview: string;
  allowMedia: boolean;
  onImageChange: (file: File | null) => void;
  onRemoveImage: () => void;
}) {
  const availableChannels = channels.filter((channel) => !channel.is_locked);
  const disabled = (text.trim().length === 0 && !image) || !channelId || publishing;

  return (
    <section className="border-b border-white/10 px-4 py-5 sm:px-5">
      <div className="flex gap-3">
        <Avatar
          initials={getInitials(currentUser?.full_name)}
          avatarUrl={resolveAvatarUrl(currentUser?.avatar_url)}
          official
        />

        <div className="min-w-0 flex-1">
          <textarea
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            placeholder="Compartilhe uma dúvida ou experiência..."
            rows={3}
            className="min-h-[92px] w-full resize-none border-0 bg-transparent py-1 text-[18px] leading-7 text-white outline-none placeholder:text-white/34"
          />

          {imagePreview ? (
            <div className="relative mt-3 overflow-hidden rounded-[16px] border border-white/10">
              <img src={imagePreview} alt="Prévia da publicação" className="max-h-[360px] w-full object-cover" />
              <button
                type="button"
                onClick={onRemoveImage}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/75 text-white"
                aria-label="Remover imagem"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}

          <div className="mt-3 flex flex-col gap-3 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-3 text-[#DBC094]">
              {allowMedia ? (
                <label className="cursor-pointer transition hover:text-white" aria-label="Adicionar imagem">
                  <ImageIcon className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="sr-only"
                    onChange={(event) => onImageChange(event.target.files?.[0] ?? null)}
                  />
                </label>
              ) : null}

              <select
                value={channelId}
                onChange={(event) => onChannelChange(event.target.value)}
                className="h-9 max-w-[220px] rounded-full border border-white/10 bg-[#050506] px-3 text-[13px] font-semibold text-[#DBC094] outline-none transition hover:border-[#DBC094]/50"
              >
                {availableChannels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={disabled}
              onClick={onSubmit}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-[#DBC094] px-4 text-[13px] font-bold text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
            >
              {publishing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PenLine className="h-3.5 w-3.5" />
              )}
              Publicar
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function CommentsDropdown({
  post,
  commentText,
  visibleCount,
  submitting,
  onCommentChange,
  onSubmitComment,
  onShowMore,
  commentImage,
  commentImagePreview,
  allowMedia,
  onCommentImageChange,
  onRemoveCommentImage,
}: {
  post: FeedPost;
  commentText: string;
  visibleCount: number;
  submitting: boolean;
  onCommentChange: (value: string) => void;
  onSubmitComment: () => void;
  onShowMore: () => void;
  commentImage: File | null;
  commentImagePreview: string;
  allowMedia: boolean;
  onCommentImageChange: (file: File | null) => void;
  onRemoveCommentImage: () => void;
}) {
  const visibleComments = post.commentsList.slice(0, visibleCount);
  const hasMore = post.commentsList.length > visibleCount;

  return (
    <div className="mt-4 rounded-[18px] border border-white/10 bg-white/[0.025] p-4">
      <div className="flex gap-3">
        <textarea
          value={commentText}
          onChange={(event) => onCommentChange(event.target.value)}
          rows={2}
          placeholder="Escreva seu comentário..."
          className="min-h-[54px] flex-1 resize-none rounded-[14px] border border-white/10 bg-black/24 px-3 py-2 text-[14px] leading-5 text-white outline-none placeholder:text-white/32 focus:border-[#DBC094]/60"
        />

        {allowMedia ? (
          <label className="flex h-[54px] w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-[14px] border border-white/10 text-[#DBC094] hover:border-[#DBC094]/50">
            <ImageIcon className="h-4 w-4" />
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(event) => onCommentImageChange(event.target.files?.[0] ?? null)}
            />
          </label>
        ) : null}

        <button
          type="button"
          onClick={onSubmitComment}
          disabled={(!commentText.trim() && !commentImage) || submitting}
          className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[14px] bg-[#DBC094] text-black transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45"
          aria-label="Enviar comentário"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      {commentImagePreview ? (
        <div className="relative mt-3 inline-block overflow-hidden rounded-[12px] border border-white/10">
          <img src={commentImagePreview} alt="Prévia do comentário" className="max-h-[180px] max-w-[280px] object-cover" />
          <button type="button" onClick={onRemoveCommentImage} className="absolute right-2 top-2 rounded-full bg-black/75 p-1.5">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div className="mt-4 divide-y divide-white/10">
        {visibleComments.length > 0 ? (
          visibleComments.map((comment) => (
            <div key={comment.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex gap-3">
                <Avatar initials={comment.initials} avatarUrl={comment.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="text-[13px] font-semibold text-white/82">
                      {comment.author}
                    </strong>
                    <span className="text-[12px] text-white/32">
                      {comment.time}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-[13px] leading-5 text-white/62">
                    {comment.body}
                  </p>
                  {comment.imageUrl ? (
                    <img
                      src={comment.imageUrl}
                      alt="Imagem do comentário"
                      className="mt-2 max-h-[320px] max-w-full rounded-[12px] object-cover"
                    />
                  ) : null}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="py-2 text-[13px] text-white/42">
            Nenhum comentário ainda. Seja o primeiro a comentar.
          </p>
        )}
      </div>

      {hasMore ? (
        <button
          type="button"
          onClick={onShowMore}
          className="mt-4 text-[13px] font-semibold text-[#DBC094] transition hover:text-white"
        >
          Ver mais comentários
        </button>
      ) : null}
    </div>
  );
}

function Post({
  post,
  highlighted,
  commentsOpen,
  commentText,
  visibleComments,
  submittingComment,
  onLike,
  onToggleComments,
  onSave,
  onReport,
  onDelete,
  onCommentChange,
  onSubmitComment,
  onShowMoreComments,
  currentUserId,
  allowReports,
  allowMedia,
  commentImage,
  commentImagePreview,
  onCommentImageChange,
  onRemoveCommentImage,
  commentsAllowed,
}: {
  post: FeedPost;
  currentUserId: string;
  highlighted: boolean;
  commentsOpen: boolean;
  commentText: string;
  visibleComments: number;
  submittingComment: boolean;
  onLike: (id: string) => void;
  onToggleComments: (id: string) => void;
  onSave: (id: string) => void;
  onReport: (id: string) => void;
  onDelete: (id: string) => void;
  onCommentChange: (id: string, value: string) => void;
  onSubmitComment: (id: string) => void;
  onShowMoreComments: (id: string) => void;
  allowReports: boolean;
  allowMedia: boolean;
  commentImage: File | null;
  commentImagePreview: string;
  onCommentImageChange: (id: string, file: File | null) => void;
  onRemoveCommentImage: (id: string) => void;
  commentsAllowed: boolean;
}) {
  const isNotification = post.sourceType === "notification";

  return (
    <article
      className={`border-b border-white/10 px-4 py-5 transition hover:bg-white/[0.025] sm:px-5 ${
        highlighted ? "bg-[#DBC094]/8 ring-1 ring-inset ring-[#DBC094]/30" : ""
      }`}
    >
      <div className="flex gap-3">
        <Avatar
          initials={post.initials}
          avatarUrl={post.avatarUrl}
          official={post.official}
        />

        <div className="min-w-0 flex-1">
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
                <strong className="truncate text-[15px] font-semibold text-white">
                  {post.author}
                </strong>

                {post.verified ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 fill-[#DBC094] text-black" />
                ) : null}

                <span className="truncate text-[14px] text-white/36">
                  {post.username}
                </span>

                <span className="text-[14px] text-white/36">· {post.time}</span>
              </div>

              <p className="mt-0.5 text-[13px] text-[#DBC094]/76">
                {post.channel}
              </p>
            </div>

            {!isNotification ? (
              <details className="relative">
                <summary
                  className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-full text-white/34 transition hover:bg-white/8 hover:text-white [&::-webkit-details-marker]:hidden"
                  aria-label="Mais opções"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </summary>
                <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-[12px] border border-white/10 bg-[#17181d] py-1 shadow-2xl">
                  <button type="button" onClick={() => onSave(post.id)} className="block w-full px-4 py-2 text-left text-sm text-white/75 hover:bg-white/8">
                    {post.saved ? "Remover dos salvos" : "Salvar publicação"}
                  </button>
                  {allowReports ? (
                    <button type="button" onClick={() => onReport(post.id)} className="block w-full px-4 py-2 text-left text-sm text-white/75 hover:bg-white/8">
                      Denunciar
                    </button>
                  ) : null}
                  {post.authorId === currentUserId ? (
                    <button type="button" onClick={() => onDelete(post.id)} className="block w-full px-4 py-2 text-left text-sm text-red-300 hover:bg-white/8">
                      Excluir
                    </button>
                  ) : null}
                </div>
              </details>
            ) : null}
          </header>

          <p className="mt-2 whitespace-pre-line text-[15px] leading-7 text-white/78">
            {post.text}
          </p>
          {post.imageUrl ? (
            <img
              src={post.imageUrl}
              alt="Imagem da publicação"
              className="mt-4 max-h-[620px] w-full rounded-[18px] border border-white/10 object-cover"
            />
          ) : null}

          {isNotification ? (
            <div className="mt-4 inline-flex rounded-full border border-[#DBC094]/18 bg-[#DBC094]/8 px-3 py-1.5 text-[12px] font-semibold text-[#DBC094]">
              Mensagem oficial enviada pela administração
            </div>
          ) : (
            <>
              <footer className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] text-white/40">
                <button
                  type="button"
                  onClick={() => onToggleComments(post.id)}
                  className="flex items-center gap-2 transition hover:text-[#DBC094]"
                >
                  <MessageCircle className="h-4 w-4" />
                  {formatNumber(post.comments)}
                </button>

                <button
                  type="button"
                  onClick={() => onLike(post.id)}
                  className={`flex items-center gap-2 transition hover:text-[#DBC094] ${
                    post.liked ? "text-[#DBC094]" : ""
                  }`}
                >
                  <Heart className={post.liked ? "h-4 w-4 fill-current" : "h-4 w-4"} />
                  {formatNumber(post.likes)}
                </button>

                <button
                  type="button"
                  onClick={() => onSave(post.id)}
                  className={`flex items-center gap-2 transition hover:text-[#DBC094] ${
                    post.saved ? "text-[#DBC094]" : ""
                  }`}
                >
                  <Bookmark className={post.saved ? "h-4 w-4 fill-current" : "h-4 w-4"} />
                  {post.saved ? "Salvo" : "Salvar"}
                </button>

                {allowReports ? (
                  <button
                    type="button"
                    onClick={() => onReport(post.id)}
                    className="flex items-center gap-2 transition hover:text-[#DBC094]"
                  >
                    <Flag className="h-4 w-4" />
                    Denunciar
                  </button>
                ) : null}

                {post.authorId === currentUserId ? (
                  <button
                    type="button"
                    onClick={() => onDelete(post.id)}
                    className="flex items-center gap-2 transition hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </button>
                ) : null}
              </footer>

              {!commentsAllowed ? (
                <p className="mt-3 text-[12px] text-white/36">Comentários bloqueados pela administração.</p>
              ) : commentsOpen ? (
                <CommentsDropdown
                  post={post}
                  commentText={commentText}
                  visibleCount={visibleComments}
                  submitting={submittingComment}
                  onCommentChange={(value) => onCommentChange(post.id, value)}
                  onSubmitComment={() => onSubmitComment(post.id)}
                  onShowMore={() => onShowMoreComments(post.id)}
                  commentImage={commentImage}
                  commentImagePreview={commentImagePreview}
                  allowMedia={allowMedia}
                  onCommentImageChange={(file) => onCommentImageChange(post.id, file)}
                  onRemoveCommentImage={() => onRemoveCommentImage(post.id)}
                />
              ) : null}
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function BackToTopButton() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#DBC094] text-black shadow-[0_20px_60px_rgba(0,0,0,0.35)] transition hover:brightness-105"
      aria-label="Voltar ao topo"
      title="Voltar ao topo"
    >
      <ArrowUp className="h-5 w-5" strokeWidth={2.2} />
    </button>
  );
}

export default function AlunoComunidadePage() {
  const [activeTab, setActiveTab] = useState<FeedTab>("para-voce");
  const [searchTerm, setSearchTerm] = useState("");
  const [composerText, setComposerText] = useState("");
  const [composerImage, setComposerImage] = useState<File | null>(null);
  const [composerImagePreview, setComposerImagePreview] = useState("");
  const [composerChannelId, setComposerChannelId] = useState("");
  const [currentUser, setCurrentUser] = useState<ProfileUser | null>(null);
  const [channels, setChannels] = useState<CommunityChannel[]>([]);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [visibleComments, setVisibleComments] = useState<Record<string, number>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentImages, setCommentImages] = useState<Record<string, File | null>>({});
  const [commentImagePreviews, setCommentImagePreviews] = useState<Record<string, string>>({});
  const [submittingCommentId, setSubmittingCommentId] = useState("");
  const [focusedNotificationId, setFocusedNotificationId] = useState("");
  const [communitySettings, setCommunitySettings] = useState(defaultCommunitySettings);

  const supabase = useMemo(() => supabaseBrowser(), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFocusedNotificationId(params.get("notificacao") ?? "");
  }, []);

  const loadCommunity = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const profileResponse = await fetch("/api/student/profile", {
        cache: "no-store",
      });

      let userProfile: ProfileUser | null = null;

      if (profileResponse.ok) {
        const data = (await profileResponse.json()) as {
          profile?: ProfileUser | null;
        };

        userProfile = data.profile ?? null;
      }

      setCurrentUser(userProfile);

      const [channelsResponse, postsResponse, notificationsResponse, settingsResponse] =
        await Promise.all([
          supabase
            .from("community_channels")
            .select("id,name,slug,description,is_locked,is_active,sort_order")
            .eq("is_active", true)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: false }),
          supabase
            .from("community_posts")
            .select("id,channel_id,author_id,title,body,image_path,status,is_pinned,allow_comments,published_at,created_at")
            .eq("status", "published")
            .order("published_at", { ascending: false })
            .limit(100),
          supabase
            .from("community_notifications")
            .select("id,title,body,target_type,channel_id,status,created_by,sent_at,created_at")
            .eq("status", "sent")
            .order("sent_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("community_settings")
            .select("key,value")
            .in("key", Object.keys(defaultCommunitySettings)),
        ]);

      if (channelsResponse.error) throw channelsResponse.error;
      if (postsResponse.error) throw postsResponse.error;
      if (notificationsResponse.error) throw notificationsResponse.error;

      if (!settingsResponse.error) {
        const loadedSettings = { ...defaultCommunitySettings };
        (settingsResponse.data ?? []).forEach((row) => {
          if (!(row.key in loadedSettings)) return;
          if (row.key === "community_rules") {
            loadedSettings.community_rules = String(row.value ?? "");
          } else {
            (loadedSettings as unknown as Record<string, boolean | string>)[row.key] =
              row.value === true || row.value === "true";
          }
        });
        setCommunitySettings(loadedSettings);
      }

      const loadedChannels =
        (channelsResponse.data ?? []) as unknown as CommunityChannel[];
      const loadedPosts =
        (postsResponse.data ?? []) as unknown as CommunityPost[];
      const loadedNotifications =
        (notificationsResponse.data ?? []) as unknown as CommunityNotification[];

      setChannels(loadedChannels);

      const firstAvailableChannel = loadedChannels.find(
        (channel) => !channel.is_locked,
      );

      setComposerChannelId((current) => current || firstAvailableChannel?.id || "");

      const postIds = loadedPosts.map((post) => post.id);
      const authorIds = Array.from(
        new Set(loadedPosts.map((post) => post.author_id)),
      );
      const notificationAuthorIds = loadedNotifications
        .map((notification) => notification.created_by)
        .filter(Boolean) as string[];

      const [commentsResponse, reactionsResponse, savedResponse] =
        await Promise.all([
          postIds.length > 0
            ? supabase
                .from("community_comments")
                .select("id,post_id,author_id,body,image_path,status,created_at")
                .in("post_id", postIds)
                .eq("status", "published")
                .order("created_at", { ascending: false })
            : Promise.resolve({ data: [], error: null }),
          postIds.length > 0
            ? supabase
                .from("community_reactions")
                .select("id,post_id,user_id,reaction_type")
                .in("post_id", postIds)
                .eq("reaction_type", "like")
            : Promise.resolve({ data: [], error: null }),
          user && postIds.length > 0
            ? supabase
                .from("community_saved_posts")
                .select("id,post_id,user_id")
                .eq("user_id", user.id)
                .in("post_id", postIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

      const comments = (commentsResponse.data ?? []) as CommunityComment[];
      const commentAuthorIds = comments.map((comment) => comment.author_id);
      const allAuthorIds = Array.from(
        new Set([
          ...authorIds,
          ...commentAuthorIds,
          ...notificationAuthorIds,
        ]),
      );

      const [profilesResponse, adminAuthorsResponse] = await Promise.all([
        allAuthorIds.length > 0
          ? supabase
              .from("profiles")
              .select("id,full_name,avatar_url,role")
              .in("id", allAuthorIds)
          : Promise.resolve({ data: [], error: null }),
        fetch("/api/student/community-authors", {
          method: "GET",
          cache: "no-store",
        }),
      ]);

      let adminAuthors: ProfileUser[] = [];

      if (adminAuthorsResponse.ok) {
        const adminAuthorsPayload = (await adminAuthorsResponse.json()) as {
          authors?: ProfileUser[];
        };

        adminAuthors = adminAuthorsPayload.authors ?? [];
      }

      const profiles = [
        ...((profilesResponse.data ?? []) as ProfileUser[]),
        ...adminAuthors,
      ].reduce(
        (acc, profile) => {
          acc.set(profile.id, profile);
          return acc;
        },
        new Map<string, ProfileUser>(),
      );

      const reactions = (reactionsResponse.data ?? []) as CommunityReaction[];
      const savedPosts = (savedResponse.data ?? []) as CommunitySavedPost[];

      const commentsByPost = comments.reduce((acc, comment) => {
        const author = profiles.get(comment.author_id);
        const authorName = author?.full_name || "Aluno";
        const existing = acc.get(comment.post_id) ?? [];

        existing.push({
          id: comment.id,
          author: authorName,
          initials: getInitials(authorName),
          avatarUrl: resolveAvatarUrl(author?.avatar_url),
          body: comment.body,
          imageUrl: resolvePublicUrl("community-media", comment.image_path),
          time: getRelativeTime(comment.created_at),
        });

        acc.set(comment.post_id, existing);
        return acc;
      }, new Map<string, FeedComment[]>());

      const likesByPost = reactions.reduce((acc, reaction) => {
        if (!reaction.post_id) return acc;
        acc.set(reaction.post_id, (acc.get(reaction.post_id) ?? 0) + 1);
        return acc;
      }, new Map<string, number>());

      const likedPostIds = new Set(
        reactions
          .filter((reaction) => reaction.user_id === user?.id)
          .map((reaction) => reaction.post_id)
          .filter(Boolean) as string[],
      );

      const savedPostIds = new Set(savedPosts.map((saved) => saved.post_id));

      const channelById = loadedChannels.reduce((acc, channel) => {
        acc.set(channel.id, channel);
        return acc;
      }, new Map<string, CommunityChannel>());

      const mappedPosts = loadedPosts.map((post) => {
        const author = profiles.get(post.author_id);
        const channel = channelById.get(post.channel_id);
        const isOfficial =
          Boolean(author?.role && author.role !== "member") ||
          getTabFromSlug(channel?.slug) === "avisos";
        const authorName =
          author?.full_name ||
          (isOfficial ? "Universidade de Líderes" : "Aluno");
        const postComments = commentsByPost.get(post.id) ?? [];

        return {
          id: post.id,
          tab: getTabFromSlug(channel?.slug),
          authorId: post.author_id,
          author: authorName,
          username: author
            ? slugHandle(authorName)
            : isOfficial
              ? "@universidadedelideres"
              : slugHandle(authorName),
          initials: getInitials(authorName),
          avatarUrl: author?.avatar_url
            ? resolveAvatarUrl(author.avatar_url)
            : isOfficial
              ? "/logo.png"
              : resolveAvatarUrl(null),
          time: getRelativeTime(post.published_at ?? post.created_at),
          channelId: post.channel_id,
          channel: channel?.name ?? "Comunidade",
          text: post.body,
          imageUrl:
            resolvePublicUrl("community-media", post.image_path) ||
            findImageUrl(post.body),
          comments: postComments.length,
          likes: likesByPost.get(post.id) ?? 0,
          liked: likedPostIds.has(post.id),
          saved: savedPostIds.has(post.id),
          verified: isOfficial,
          official: isOfficial,
          sourceType: "post",
          allowComments: post.allow_comments ?? true,
          commentsList: postComments,
        } satisfies FeedPost;
      });

      const mappedNotifications: FeedPost[] = loadedNotifications.map((notification) => {
        const notificationChannel = notification.channel_id
          ? channelById.get(notification.channel_id)
          : null;
        const author = notification.created_by
          ? profiles.get(notification.created_by)
          : null;
        const authorName =
          author?.full_name || "Universidade de Líderes";
        const cleanTitle = notification.title?.trim();
        const cleanBody = notification.body?.trim();

        return {
          id: `notification-${notification.id}`,
          tab: "avisos",
          authorId: notification.created_by ?? "unl",
          author: authorName,
          username: author
            ? slugHandle(authorName)
            : "@universidadedelideres",
          initials: getInitials(authorName),
          avatarUrl: author?.avatar_url
            ? resolveAvatarUrl(author.avatar_url)
            : "/logo.png",
          time: getRelativeTime(notification.sent_at ?? notification.created_at),
          channelId: notification.channel_id ?? "",
          channel: notificationChannel?.name ?? "Avisos oficiais",
          text: [cleanTitle, cleanBody].filter(Boolean).join("\n\n"),
          imageUrl: findImageUrl([cleanTitle, cleanBody].filter(Boolean).join("\n\n")),
          comments: 0,
          likes: 0,
          liked: false,
          saved: false,
          verified: true,
          official: true,
          sourceType: "notification",
          notificationId: notification.id,
          allowComments: false,
          commentsList: [],
        };
      });

      setPosts([...mappedNotifications, ...mappedPosts]);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar a comunidade.",
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadCommunity();
  }, [loadCommunity]);

  const tabCounts = useMemo(() => {
    const counts = new Map<FeedTab, number>();

    posts.forEach((post) => {
      counts.set(post.tab, (counts.get(post.tab) ?? 0) + 1);
    });

    return counts;
  }, [posts]);

  const tabs = useMemo(() => {
    return fallbackTabs.map((tab) => {
      if (tab.id === "para-voce" || tab.id === "seguindo") return tab;

      return {
        ...tab,
        count: tabCounts.get(tab.id) ?? tab.count,
      };
    });
  }, [tabCounts]);

  const visiblePosts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return posts.filter((post) => {
      const tabMatch =
        activeTab === "para-voce" ||
        post.tab === activeTab ||
        (activeTab === "seguindo" && !post.official);

      if (!tabMatch) return false;

      if (!normalizedSearch) return true;

      return `${post.author} ${post.channel} ${post.text}`
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [activeTab, posts, searchTerm]);

  function validateImage(file: File) {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      return "Envie uma imagem JPG, PNG, WEBP ou GIF.";
    }
    if (file.size > 10 * 1024 * 1024) {
      return "A imagem deve ter no máximo 10 MB.";
    }
    return "";
  }

  function selectComposerImage(file: File | null) {
    if (!file) return;
    const validation = validateImage(file);
    if (validation) {
      setMessage(validation);
      return;
    }
    if (composerImagePreview) URL.revokeObjectURL(composerImagePreview);
    setComposerImage(file);
    setComposerImagePreview(URL.createObjectURL(file));
  }

  function removeComposerImage() {
    if (composerImagePreview) URL.revokeObjectURL(composerImagePreview);
    setComposerImage(null);
    setComposerImagePreview("");
  }

  function selectCommentImage(postId: string, file: File | null) {
    if (!file) return;
    const validation = validateImage(file);
    if (validation) {
      setMessage(validation);
      return;
    }
    const existing = commentImagePreviews[postId];
    if (existing) URL.revokeObjectURL(existing);
    setCommentImages((current) => ({ ...current, [postId]: file }));
    setCommentImagePreviews((current) => ({
      ...current,
      [postId]: URL.createObjectURL(file),
    }));
  }

  function removeCommentImage(postId: string) {
    const existing = commentImagePreviews[postId];
    if (existing) URL.revokeObjectURL(existing);
    setCommentImages((current) => ({ ...current, [postId]: null }));
    setCommentImagePreviews((current) => ({ ...current, [postId]: "" }));
  }

  async function uploadCommunityImage(
    file: File,
    userId: string,
    kind: "posts" | "comments",
  ) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${kind}/${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from("community-media")
      .upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false,
      });
    if (error) throw error;
    return path;
  }

  async function handlePublish() {
    const cleanText = composerText.trim();

    if ((!cleanText && !composerImage) || !composerChannelId || publishing) return;
    if (!communitySettings.allow_student_posts) {
      setMessage("Novas publicações estão desativadas pela administração.");
      return;
    }

    setPublishing(true);
    setMessage("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("Faça login para publicar na comunidade.");
        return;
      }

      const imagePath =
        composerImage && communitySettings.allow_media_uploads
          ? await uploadCommunityImage(composerImage, user.id, "posts")
          : null;

      const { error } = await supabase.from("community_posts").insert({
        channel_id: composerChannelId,
        author_id: user.id,
        title: null,
        body: cleanText || "Imagem compartilhada",
        image_path: imagePath,
        status: communitySettings.require_post_approval ? "pending" : "published",
        published_at: communitySettings.require_post_approval
          ? null
          : new Date().toISOString(),
      });

      if (error) throw error;

      setComposerText("");
      removeComposerImage();
      setActiveTab("para-voce");
      await loadCommunity();
      if (communitySettings.require_post_approval) {
        setMessage("Publicação enviada para aprovação da moderação.");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível publicar agora.",
      );
    } finally {
      setPublishing(false);
    }
  }

  async function handleLike(postId: string) {
    const post = posts.find((item) => item.id === postId);

    if (!post || post.sourceType === "notification") return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Faça login para curtir.");
      return;
    }

    setPosts((current) =>
      current.map((item) =>
        item.id === postId
          ? {
              ...item,
              liked: !item.liked,
              likes: item.liked ? Math.max(0, item.likes - 1) : item.likes + 1,
            }
          : item,
      ),
    );

    if (post.liked) {
      await supabase
        .from("community_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id)
        .eq("reaction_type", "like");
      return;
    }

    await supabase.from("community_reactions").insert({
      post_id: postId,
      user_id: user.id,
      reaction_type: "like",
    });
  }

  async function handleSubmitComment(postId: string) {
    const post = posts.find((item) => item.id === postId);

    if (!post || post.sourceType === "notification" || !post.allowComments) return;

    const body = commentInputs[postId]?.trim();
    const image = commentImages[postId] ?? null;

    if (!body && !image) return;
    if (!communitySettings.allow_student_comments) {
      setMessage("Comentários estão desativados pela administração.");
      return;
    }

    setSubmittingCommentId(postId);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setMessage("Faça login para comentar.");
        return;
      }

      const imagePath =
        image && communitySettings.allow_media_uploads
          ? await uploadCommunityImage(image, user.id, "comments")
          : null;

      const { error } = await supabase.from("community_comments").insert({
        post_id: postId,
        author_id: user.id,
        body: body || "Imagem compartilhada",
        image_path: imagePath,
        status: communitySettings.require_comment_approval ? "hidden" : "published",
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setCommentInputs((current) => ({
        ...current,
        [postId]: "",
      }));
      removeCommentImage(postId);
      setOpenComments((current) => ({
        ...current,
        [postId]: true,
      }));
      setVisibleComments((current) => ({
        ...current,
        [postId]: current[postId] ?? 5,
      }));

      await loadCommunity();
      if (communitySettings.require_comment_approval) {
        setMessage("Comentário enviado para aprovação da moderação.");
      }
    } finally {
      setSubmittingCommentId("");
    }
  }

  async function handleSave(postId: string) {
    const post = posts.find((item) => item.id === postId);

    if (!post || post.sourceType === "notification") return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Faça login para salvar.");
      return;
    }

    setPosts((current) =>
      current.map((item) =>
        item.id === postId
          ? {
              ...item,
              saved: !item.saved,
            }
          : item,
      ),
    );

    if (post.saved) {
      await supabase
        .from("community_saved_posts")
        .delete()
        .eq("post_id", postId)
        .eq("user_id", user.id);
      return;
    }

    await supabase.from("community_saved_posts").insert({
      post_id: postId,
      user_id: user.id,
    });
  }

  function toggleComments(postId: string) {
    const post = posts.find((item) => item.id === postId);

    if (!post?.allowComments) return;

    setOpenComments((current) => ({
      ...current,
      [postId]: !current[postId],
    }));

    setVisibleComments((current) => ({
      ...current,
      [postId]: current[postId] ?? 5,
    }));
  }

  function showMoreComments(postId: string) {
    setVisibleComments((current) => ({
      ...current,
      [postId]: (current[postId] ?? 5) + 5,
    }));
  }

  async function handleReport(postId: string) {
    const post = posts.find((item) => item.id === postId);

    if (!post || post.sourceType === "notification") return;

    const reason = window.prompt("Informe o motivo da denúncia:");

    if (!reason?.trim()) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Faça login para denunciar.");
      return;
    }

    const { error } = await supabase.from("community_reports").insert({
      post_id: postId,
      reporter_id: user.id,
      reason: reason.trim(),
      message: null,
      status: "open",
    });

    setMessage(
      error
        ? error.message
        : "Denúncia enviada. A administração fará a análise.",
    );
  }

  async function handleDeleteOwnPost(postId: string) {
    const post = posts.find((item) => item.id === postId);

    if (!post || post.sourceType === "notification") return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || post.authorId !== user.id) {
      setMessage("Você só pode excluir suas próprias publicações.");
      return;
    }

    const confirmed = window.confirm("Deseja excluir esta publicação?");

    if (!confirmed) return;

    const { error } = await supabase
      .from("community_posts")
      .update({ status: "deleted" })
      .eq("id", postId)
      .eq("author_id", user.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    await loadCommunity();
  }

  return (
    <main className="min-h-screen bg-[#050506] text-white">
      <StudentHeader />

      <section className="mx-auto min-h-screen w-full max-w-[760px] border-x border-white/10 pt-[84px]">
        <header className="sticky top-[84px] z-30 border-b border-white/10 bg-[#050506]/94 backdrop-blur">
          <div className="px-4 pt-4 sm:px-5">
            <h1 className="text-center text-[24px] font-semibold tracking-[-0.04em]">
              Feed
            </h1>

            <label className="mt-4 flex h-11 items-center gap-3 rounded-full border border-white/10 bg-white/[0.035] px-4 text-white/44 transition focus-within:border-[#DBC094]/65">
              <Search className="h-4 w-4 shrink-0" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar na comunidade"
                className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/34"
              />

              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="rounded-full p-1 text-white/38 transition hover:bg-white/8 hover:text-white"
                  aria-label="Limpar busca"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </label>
          </div>

          <nav className="mt-3 flex overflow-x-auto border-t border-white/8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((item) => (
              <TabButton
                key={item.id}
                item={item}
                active={item.id === activeTab}
                onClick={() => setActiveTab(item.id)}
              />
            ))}
          </nav>
        </header>

        {message ? (
          <div className="border-b border-white/10 px-5 py-3 text-[13px] text-[#DBC094]">
            {message}
          </div>
        ) : null}

        {communitySettings.community_rules ? (
          <details className="border-b border-white/10 px-5 py-3 text-sm">
            <summary className="cursor-pointer font-semibold text-[#DBC094]">
              Regras da comunidade
            </summary>
            <p className="mt-3 whitespace-pre-line leading-6 text-white/55">
              {communitySettings.community_rules}
            </p>
          </details>
        ) : null}

        {communitySettings.allow_student_posts ? (
          <Composer
            currentUser={currentUser}
            text={composerText}
            channelId={composerChannelId}
            channels={channels}
            onTextChange={setComposerText}
            onChannelChange={setComposerChannelId}
            onSubmit={handlePublish}
            publishing={publishing}
            image={composerImage}
            imagePreview={composerImagePreview}
            allowMedia={communitySettings.allow_media_uploads}
            onImageChange={selectComposerImage}
            onRemoveImage={removeComposerImage}
          />
        ) : (
          <div className="border-b border-white/10 px-5 py-4 text-sm text-white/45">
            Novas publicações estão temporariamente desativadas.
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-3 px-5 py-16 text-[14px] text-white/52">
            <Loader2 className="h-4 w-4 animate-spin text-[#DBC094]" />
            Carregando comunidade...
          </div>
        ) : visiblePosts.length > 0 ? (
          visiblePosts.map((post) => (
            <Post
              key={post.id}
              post={post}
              highlighted={
                Boolean(focusedNotificationId) &&
                post.notificationId === focusedNotificationId
              }
              commentsOpen={Boolean(openComments[post.id])}
              commentText={commentInputs[post.id] ?? ""}
              visibleComments={visibleComments[post.id] ?? 5}
              submittingComment={submittingCommentId === post.id}
              onLike={handleLike}
              onToggleComments={toggleComments}
              onSave={handleSave}
              onReport={handleReport}
              onDelete={handleDeleteOwnPost}
              currentUserId={currentUser?.id ?? ""}
              onCommentChange={(postId, value) =>
                setCommentInputs((current) => ({
                  ...current,
                  [postId]: value,
                }))
              }
              onSubmitComment={handleSubmitComment}
              onShowMoreComments={showMoreComments}
              allowReports={communitySettings.allow_reports}
              allowMedia={communitySettings.allow_media_uploads}
              commentImage={commentImages[post.id] ?? null}
              commentImagePreview={commentImagePreviews[post.id] ?? ""}
              onCommentImageChange={selectCommentImage}
              onRemoveCommentImage={removeCommentImage}
              commentsAllowed={
                communitySettings.allow_student_comments && post.allowComments
              }
            />
          ))
        ) : (
          <div className="px-5 py-14 text-center">
            <p className="text-[18px] font-semibold text-white">
              Nenhuma publicação
            </p>
            <p className="mt-2 text-[14px] leading-6 text-white/46">
              Publique uma dúvida ou escolha outro canal.
            </p>
          </div>
        )}
      </section>

      <BackToTopButton />
    </main>
  );
}
