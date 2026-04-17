"use client"

import { useEffect, useState } from "react"
import { User, Trophy, Recycle, Calendar, TrendingUp, Award } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface Profile {
  email: string
  total_points: number
  total_recycled: number
  created_at: string
}

interface RecyclingEvent {
  id: string
  plate: string
  points: number
  status: string
  created_at: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [events, setEvents] = useState<RecyclingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    if (!supabase) {
      setLoading(false)
      return
    }

    // Check auth
    supabase.auth.getUser().then((response: any) => {
      const { user } = response.data
      if (!user) {
        router.push("/auth/login")
        return
      }
      setUser(user)
    })

    // Load profile data
    const loadProfile = async () => {
      try {
        const response = await supabase.auth.getUser()
        const user = response.data?.user
        if (!user) return

        // Get profile stats
        const { data: profileData } = await supabase
          .from("profiles")
          .select("total_points, total_recycled, created_at")
          .eq("id", user.id)
          .single()

        // Get recycling events
        const { data: eventsData } = await supabase
          .from("recycling_events")
          .select("id, plate, points, status, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(10)

        setProfile({
          email: user.email || "",
          total_points: profileData?.total_points || 0,
          total_recycled: profileData?.total_recycled || 0,
          created_at: profileData?.created_at || new Date().toISOString(),
        })

        setEvents(eventsData || [])
      } catch (error) {
        console.error("Error loading profile:", error)
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [router])

  if (loading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Cargando perfil...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-CL", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                <User className="w-8 h-8 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl">{profile.email.split("@")[0]}</CardTitle>
                <p className="text-muted-foreground">{profile.email}</p>
                <p className="text-sm text-muted-foreground">
                  Miembro desde {formatDate(profile.created_at)}
                </p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Puntos Totales</p>
                  <p className="text-2xl font-bold">{profile.total_points}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Recycle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Reciclado</p>
                  <p className="text-2xl font-bold">{profile.total_recycled} kg</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Eventos</p>
                  <p className="text-2xl font-bold">{events.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Recycle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Aún no has registrado eventos de reciclaje</p>
                <p className="text-sm">¡Comienza escaneando tus primeros residuos!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Award className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Placa: {event.plate}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(event.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">+{event.points} pts</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {event.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rewards Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Canjear Puntos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Próximamente: Canjea tus puntos por premios y descuentos</p>
              <p className="text-sm">Sigue reciclando para acumular puntos</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
