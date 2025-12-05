"use client"

import { Button } from "./ui/button"
import { Switch } from "./ui/switch"
import { Label } from "./ui/label"
import { Sparkles, Settings, Menu, Code } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet"
import { ChatSidebar } from "./chat-sidebar"
import { usePowerUser } from "@/contexts/PowerUserContext"

export function ChatHeader({ onMenuClick }: { onMenuClick?: () => void }) {
  const { isPowerUser, togglePowerUser } = usePowerUser()

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-black/80 backdrop-blur-md border-b border-white/10 z-50">
      <div className="h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sheet>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-[250px] p-0 bg-gradient-to-b from-zinc-950 to-black border-r border-white/10"
            >
              <ChatSidebar />
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            <span className="font-semibold text-lg">EVERDIAN AI</span>
          </div>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
          <p className="text-sm text-foreground/60 font-mono">Your AI-powered event analyst</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900/50 border border-white/10">
            <Code className={`h-4 w-4 ${isPowerUser ? 'text-blue-400' : 'text-muted-foreground'}`} />
            <Label htmlFor="power-user-toggle" className="text-xs cursor-pointer">
              Power User
            </Label>
            <Switch
              id="power-user-toggle"
              checked={isPowerUser}
              onCheckedChange={togglePowerUser}
            />
          </div>
          <Button size="sm" className="bg-transparent border-white/10 hover:bg-zinc-800">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  )
}
