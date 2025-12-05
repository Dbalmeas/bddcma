"use client"

import { GL } from "@/components/gl"
import { ChatSidebar } from "@/components/chat-sidebar"
import { ChatArea } from "@/components/chat-area"
import { Toaster } from "@/components/ui/toaster"
import { PowerUserProvider } from "@/contexts/PowerUserContext"
import { Leva } from "leva"
import { Header } from "@/components/header"

export default function Home() {
  return (
    <PowerUserProvider>
      <div className="relative min-h-screen overflow-hidden text-foreground">
        <div className="fixed inset-0 -z-10 opacity-30">
          <GL hovering={false} />
        </div>

        <main className="relative z-10 flex flex-col pb-12">
          <Header />
          <section id="workspace" className="pt-20 md:pt-24 scroll-mt-32 min-h-[calc(100vh-5rem)]">
            <div className="flex flex-col lg:flex-row min-h-[calc(100vh-8rem)]">
              <div className="hidden lg:block w-[260px] pt-4">
                <ChatSidebar />
              </div>
              <div className="flex-1 min-h-[calc(100vh-8rem)]">
                <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
                  <ChatArea />
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      <Toaster />
      <Leva hidden />
    </PowerUserProvider>
  )
}
