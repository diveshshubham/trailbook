"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { getMyInvitations, acceptInvitation, rejectInvitation, type AlbumInvitation } from "@/lib/publicAlbumsApi";
import { getMyProfile } from "@/lib/userApi";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { resolveProfilePictureUrl } from "@/lib/userApi";
import ClickableUserAvatar from "@/components/User/ClickableUserAvatar";
import Image from "next/image";
import Link from "next/link";

export default function InvitationsList() {
  const { themeKey } = useTheme();
  const isDefault = themeKey === "default";

  const [invitations, setInvitations] = useState<AlbumInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
    loadInvitations();
  }, []);

  const loadCurrentUser = async () => {
    try {
      const me = await getMyProfile();
      setCurrentUserId(me.user._id);
    } catch {
      // Ignore - user might not be logged in
    }
  };

  const loadInvitations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyInvitations();
      // Show ALL invitations - both sent and received
      setInvitations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invitations");
    } finally {
      setLoading(false);
    }
  };

  // Reload invitations when currentUserId is loaded
  useEffect(() => {
    if (currentUserId !== null) {
      loadInvitations();
    }
  }, [currentUserId]);

  const handleAccept = async (invitationId: string) => {
    setProcessingId(invitationId);
    try {
      await acceptInvitation(invitationId);
      await loadInvitations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to accept invitation");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (invitationId: string) => {
    setProcessingId(invitationId);
    try {
      await rejectInvitation(invitationId);
      await loadInvitations();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reject invitation");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-32 rounded-2xl border animate-pulse" style={{ backgroundColor: "var(--theme-surface-hover)", borderColor: "var(--theme-border)" }} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-2xl text-sm" style={{ backgroundColor: "var(--theme-error-light)", color: "var(--theme-error)" }}>
        {error}
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-3 opacity-50">📬</div>
        <p className="text-sm" style={{ color: "var(--theme-text-tertiary)" }}>
          No invitations
        </p>
      </div>
    );
  }

  // Separate sent vs received invitations
  const sentInvitations = invitations.filter((inv) => currentUserId && inv.inviter?._id === currentUserId);
  const receivedInvitations = invitations.filter((inv) => !currentUserId || inv.inviter?._id !== currentUserId);

  const renderInvitationCard = (invitation: AlbumInvitation, isSent: boolean) => {
    const invitationId = invitation._id || invitation.id || "";
    const album = invitation.album;
    const inviter = invitation.inviter;
    const inviterId = inviter?._id || "";
    // Use fullName from inviter directly, or profile.fullName, or email as fallback
    const inviterName = (inviter as { fullName?: string; profile?: { fullName?: string } })?.fullName || 
                       inviter?.profile?.fullName || 
                       inviter?.email || 
                       "Unknown";
    const inviterProfilePictureRaw = (inviter as { profilePicture?: string })?.profilePicture || 
                                    inviter?.profile?.profilePicture;
    const inviterProfilePicture = inviterProfilePictureRaw ? resolveProfilePictureUrl(inviterProfilePictureRaw) : null;
    const coverUrl = album?.coverImage ? resolveMediaUrl(album.coverImage) : null;
    const permissionColor =
      invitation.permission === "admin"
        ? isDefault ? "rgb(234, 88, 12)" : "var(--theme-accent)"
        : invitation.permission === "contributor"
        ? isDefault ? "rgb(59, 130, 246)" : "var(--theme-info)"
        : "var(--theme-text-tertiary)";

    // For sent invitations, show invitee info if available
    const inviteeEmail = invitation.inviteeEmail;
    const inviteePhone = invitation.inviteePhone;
    const inviteeUserId = invitation.inviteeUserId;

    return (
          <div
            key={invitationId}
            className="rounded-2xl border overflow-hidden transition-all"
            style={{
              backgroundColor: "var(--theme-surface)",
              borderColor: "var(--theme-border)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div className="flex gap-4 p-4">
              {/* Album Cover */}
              {coverUrl ? (
                <Link href={`/album/${album?._id || ""}`} className="h-20 w-20 rounded-xl overflow-hidden border shrink-0" style={{ borderColor: "var(--theme-border)" }}>
                  <Image src={coverUrl} alt={album?.title || "Album"} width={80} height={80} className="w-full h-full object-cover" />
                </Link>
              ) : (
                <div className="h-20 w-20 rounded-xl border shrink-0 flex items-center justify-center" style={{ backgroundColor: "var(--theme-surface-hover)", borderColor: "var(--theme-border)" }}>
                  <span className="text-2xl opacity-50">📷</span>
                </div>
              )}

              {/* Invitation Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <Link href={`/album/${album?._id || ""}`}>
                      <h3 className="text-base font-semibold truncate mb-1 hover:underline" style={{ color: "var(--theme-text-primary)" }}>
                        {album?.title || "Untitled Album"}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 mb-2">
                      {isSent ? (
                        // For sent invitations, show who we invited
                        <>
                          <div className="h-6 w-6 rounded-full flex items-center justify-center text-xs" style={{ backgroundColor: "var(--theme-surface-hover)", color: "var(--theme-text-tertiary)" }}>
                            {inviteeUserId ? "👤" : "📧"}
                          </div>
                          <p className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
                            {inviteeEmail || inviteePhone || inviteeUserId ? `Invited: ${inviteeEmail || inviteePhone || "User"}` : "You sent this invitation"}
                          </p>
                        </>
                      ) : (
                        // For received invitations, show who invited us
                        <>
                          {inviterId ? (
                            <ClickableUserAvatar
                              userId={inviterId}
                              profilePicture={inviterProfilePicture}
                              name={inviterName}
                              size="sm"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full" style={{ backgroundColor: "var(--theme-surface-hover)" }} />
                          )}
                          <p className="text-xs" style={{ color: "var(--theme-text-secondary)" }}>
                            {inviterName} invited you
                          </p>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase"
                        style={{ backgroundColor: `${permissionColor}20`, color: permissionColor }}
                      >
                        {invitation.permission}
                      </span>
                      {/* Status Badge */}
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          invitation.status === "accepted"
                            ? ""
                            : invitation.status === "rejected"
                            ? ""
                            : ""
                        }`}
                        style={{
                          backgroundColor:
                            invitation.status === "accepted"
                              ? isDefault ? "rgba(16, 185, 129, 0.2)" : "var(--theme-success-light)"
                              : invitation.status === "rejected"
                              ? isDefault ? "rgba(239, 68, 68, 0.2)" : "var(--theme-error-light)"
                              : isDefault ? "rgba(251, 191, 36, 0.2)" : "var(--theme-warning-light)",
                          color:
                            invitation.status === "accepted"
                              ? isDefault ? "rgb(16, 185, 129)" : "var(--theme-success)"
                              : invitation.status === "rejected"
                              ? isDefault ? "rgb(239, 68, 68)" : "var(--theme-error)"
                              : isDefault ? "rgb(251, 191, 36)" : "var(--theme-warning)",
                        }}
                      >
                        {invitation.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions - Only show for pending RECEIVED invitations */}
                {!isSent && invitation.status === "pending" && (
                  <div className="flex gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => handleAccept(invitationId)}
                      disabled={processingId === invitationId}
                      className="flex-1 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{
                        backgroundColor: "var(--theme-accent)",
                        color: "white",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = "0.9";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "1";
                      }}
                    >
                      {processingId === invitationId ? "Processing..." : "Accept"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(invitationId)}
                      disabled={processingId === invitationId}
                      className="px-4 py-2 rounded-xl text-sm font-medium border transition-all"
                      style={{
                        backgroundColor: "var(--theme-surface-hover)",
                        borderColor: "var(--theme-border)",
                        color: "var(--theme-text-primary)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--theme-surface-elevated)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--theme-surface-hover)";
                      }}
                    >
                      Decline
                    </button>
                  </div>
                )}
                
                {/* Status message for all invitations */}
                {invitation.status !== "pending" && (
                  <div className="mt-3">
                    <p className="text-xs" style={{ color: "var(--theme-text-tertiary)" }}>
                      {isSent
                        ? invitation.status === "accepted"
                          ? "They accepted your invitation"
                          : invitation.status === "rejected"
                          ? "They declined your invitation"
                          : "Waiting for response"
                        : invitation.status === "accepted"
                        ? "You accepted this invitation"
                        : invitation.status === "rejected"
                        ? "You declined this invitation"
                        : ""}
                    </p>
                  </div>
                )}
                
                {/* Status message for pending sent invitations */}
                {isSent && invitation.status === "pending" && (
                  <div className="mt-3">
                    <p className="text-xs" style={{ color: "var(--theme-text-tertiary)" }}>
                      Waiting for response
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
  };

  return (
    <div className="space-y-8">
      {/* Received Invitations */}
      {receivedInvitations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--theme-text-primary)" }}>
            Received Invitations
          </h2>
          <div className="space-y-4">
            {receivedInvitations.map((invitation) => renderInvitationCard(invitation, false))}
          </div>
        </div>
      )}

      {/* Sent Invitations */}
      {sentInvitations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4" style={{ color: "var(--theme-text-primary)" }}>
            Sent Invitations
          </h2>
          <div className="space-y-4">
            {sentInvitations.map((invitation) => renderInvitationCard(invitation, true))}
          </div>
        </div>
      )}
    </div>
  );
}
