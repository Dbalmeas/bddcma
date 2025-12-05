"use client"

import { Button } from "./ui/button"
import { Card } from "./ui/card"
import { Separator } from "./ui/separator"
import { Clock, Plus, Download, Trash2 } from "lucide-react"
import { useConversations } from "@/hooks/useConversations"
import { formatDistanceToNow } from "date-fns"
import { fr } from "date-fns/locale"
import { useToast } from "./ui/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import {
  exportToJSON,
  exportToCSV,
  downloadFile,
} from "@/lib/conversation-manager"

const navigationItems = [
  { icon: Clock, label: "History" },
]

export function ChatSidebar() {
  const { conversations, setCurrentConversationId, deleteConversation, currentConversationId } = useConversations()
  const { toast } = useToast()

  const handleLoadConversation = (id: string) => {
    setCurrentConversationId(id)
  }

  const handleDeleteConversation = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    deleteConversation(id)
    toast({
      title: "Deleted",
      description: "Conversation deleted successfully",
    })
  }

  const handleNewChat = () => {
    window.dispatchEvent(new CustomEvent('new-chat'));
  }

  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const hasMessages = currentConversation?.messages && currentConversation.messages.length > 0;

  const handleExportJSON = () => {
    if (!currentConversation) {
      toast({
        title: "No conversation",
        description: "No conversation to export",
        variant: "destructive",
      });
      return;
    }
    const json = exportToJSON(currentConversation);
    const filename = `cma-cgm-chat-${currentConversation.id.slice(0, 8)}.json`;
    downloadFile(json, filename, "application/json");
    toast({
      title: "Exported",
      description: `Downloaded as ${filename}`,
    });
  };

  const handleExportCSV = () => {
    if (!currentConversation) {
      toast({
        title: "No conversation",
        description: "No conversation to export",
        variant: "destructive",
      });
      return;
    }
    const csv = exportToCSV(currentConversation);
    const filename = `cma-cgm-chat-${currentConversation.id.slice(0, 8)}.csv`;
    downloadFile(csv, filename, "text/csv");
    toast({
      title: "Exported",
      description: `Downloaded as ${filename}`,
    });
  };

  // Trier par date de mise à jour (plus récent en premier)
  const sortedConversations = [...conversations].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )

  return (
    <aside className="h-full flex flex-col" style={{ backgroundColor: 'var(--muted)' }}>
      <div className="pt-3 lg:pt-3 px-4 flex-1 overflow-y-auto">
        <nav className="space-y-3 mb-8">
          {navigationItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className="flex w-full items-center gap-3 px-1 py-2 text-sm md:text-base text-foreground/80 hover:text-foreground"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
          
          <button
            type="button"
            onClick={handleNewChat}
            className="flex w-full items-center gap-3 px-1 py-2 text-sm md:text-base text-foreground/80 hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={!hasMessages}
                className="flex w-full items-center gap-3 px-1 py-2 text-sm md:text-base text-foreground/80 hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleExportJSON} disabled={!hasMessages}>
                Export as JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV} disabled={!hasMessages}>
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <Separator className="my-4 bg-white/10" />

        <div>
          <h3 className="text-xs font-semibold text-foreground/60 mb-3 px-3">RECENT SESSIONS</h3>
          <div className="space-y-2">
            {sortedConversations.length === 0 ? (
              <p className="text-xs text-foreground/40 px-3 py-4 text-center">
                No conversations yet.<br />
                Start asking questions!
              </p>
            ) : (
              sortedConversations.map((conv) => {
                const firstUserMsg = conv.messages.find((m) => m.role === "user")
                const preview = firstUserMsg?.content.substring(0, 60) || "Empty conversation"
                const timeAgo = formatDistanceToNow(new Date(conv.updatedAt), {
                  addSuffix: true,
                  locale: fr,
                })

                return (
                  <Card
                    key={conv.id}
                    onClick={() => handleLoadConversation(conv.id)}
                    className="p-3 border-white/5 transition-colors cursor-pointer group"
                    style={{ 
                      backgroundColor: 'var(--card)',
                      borderColor: 'var(--border)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--muted)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--card)'
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium mb-1 truncate">{conv.title}</h4>
                        <p className="text-xs text-foreground/50 mb-1">{timeAgo}</p>
                        <p className="text-xs text-foreground/60 line-clamp-1">{preview}</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={(e) => handleDeleteConversation(e, conv.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0 bg-red-500/20 hover:bg-red-500/40 border-red-500/30"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </div>
      </div>
    </aside>
  )
}

