"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MessageSquare, Mic, History, Moon, Sun, Sparkles } from "lucide-react"
import { Card } from "@/components/ui/card"

export function TutorialDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    // Afficher le tutoriel à chaque chargement de page
    setOpen(true)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto transition-all duration-300 ease-in-out">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Guide rapide
            </DialogTitle>
          </div>
          <DialogDescription className="text-base">
            Découvrez comment utiliser l'application en quelques secondes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Étape 1 */}
          <Card className="p-4 border-2 border-primary/20 hover:border-primary/40 transition-all duration-200 ease-in-out hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">1. Posez vos questions</h3>
                <p className="text-sm text-muted-foreground">
                  Tapez votre question dans le champ de saisie en bas de l'écran. L'IA analysera vos données et vous répondra instantanément.
                </p>
              </div>
            </div>
          </Card>

          {/* Étape 2 */}
          <Card className="p-4 border-2 border-primary/20 hover:border-primary/40 transition-all duration-200 ease-in-out hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Mic className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">2. Utilisez la dictée vocale</h3>
                <p className="text-sm text-muted-foreground">
                  Cliquez sur l'icône microphone <Mic className="inline h-3 w-3 mx-1" /> pour dicter vos questions au lieu de les taper.
                </p>
              </div>
            </div>
          </Card>

          {/* Étape 3 */}
          <Card className="p-4 border-2 border-primary/20 hover:border-primary/40 transition-all duration-200 ease-in-out hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <History className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">3. Consultez l'historique</h3>
                <p className="text-sm text-muted-foreground">
                  Retrouvez toutes vos conversations précédentes dans la barre latérale. Cliquez sur "Nouvelle conversation" pour démarrer un nouveau chat.
                </p>
              </div>
            </div>
          </Card>

          {/* Étape 4 */}
          <Card className="p-4 border-2 border-primary/20 hover:border-primary/40 transition-all duration-200 ease-in-out hover:shadow-md">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Moon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-sm mb-1">4. Personnalisez l'apparence</h3>
                <p className="text-sm text-muted-foreground">
                  Utilisez l'interrupteur en haut de la barre latérale pour basculer entre le thème clair et sombre selon vos préférences.
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <Button 
            onClick={() => setOpen(false)} 
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-200 ease-in-out hover:scale-[1.02] active:scale-[0.98]"
          >
            C'est parti ! 🚀
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

