import React, { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Upload, Shirt, Filter, Sparkles, Trash2, Palette, Ruler, Wand2, Sun, Moon, RefreshCw } from 'lucide-react'

type GarmentType = 'top' | 'bottom' | 'dress' | 'outerwear' | 'shoes' | 'accessory'
type FitGoal = 'elongate' | 'balance' | 'accentuateShoulders' | 'accentuateWaist' | 'minimizeHips' | 'relaxed'
type StyleVibe = 'classic' | 'minimalist' | 'sporty' | 'street' | 'elegant' | 'boho' | 'edgy' | 'preppy'

interface Garment {
  id: string
  name: string
  type: GarmentType
  colorHex: string
  colorName: string
  imageDataUrl: string
  tags: string[]
  season?: ('spring' | 'summer' | 'autumn' | 'winter')[]
}

interface CustomerProfile {
  name?: string
  bodyType?: 'rectangle' | 'triangle' | 'invertedTriangle' | 'hourglass' | 'oval'
  heightCm?: number
  skinUndertone?: 'cool' | 'warm' | 'neutral'
  preferredStyles: StyleVibe[]
  avoidNotes?: string
  favoriteColors?: string[]
  dislikedColors?: string[]
  formalityScale?: 1 | 2 | 3 | 4 | 5
}

const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: string, size?: string}> = ({ className = '', children, ...props }) => (
  <button {...props} className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 shadow-sm border border-gray-200 hover:shadow transition disabled:opacity-50 ${className}`}>{children}</button>
)
const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div {...props} className={`rounded-2xl border border-gray-200 shadow-sm bg-white ${className}`}>{children}</div>
)
const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = '', children, ...props }) => (
  <div {...props} className={`p-4 ${className}`}>{children}</div>
)
const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = ({ className = '', ...props }) => (
  <input {...props} className={`w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${className}`} />
)
const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = ({ className = '', children, ...props }) => (
  <select {...props} className={`w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${className}`}>{children}</select>
)
const TextArea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className = '', ...props }) => (
  <textarea {...props} className={`w-full rounded-xl border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-200 ${className}`} />
)
const Badge: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({ className = '', children, ...props }) => (
  <span {...props} className={`inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-1 text-xs bg-gray-50 ${className}`}>{children}</span>
)

function uid() { return Math.random().toString(36).slice(2, 10) }

function hexToRgb(hex: string) {
  const parsed = hex.replace('#','')
  const str = parsed.length===3 ? parsed.split('').map(c=>c+c).join('') : parsed
  const bigint = parseInt(str, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return { r, g, b }
}
function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r,g,b].map(v => v.toString(16).padStart(2, '0')).join('')
}
function colorDistance(hex1: string, hex2: string) {
  const a = hexToRgb(hex1); const b = hexToRgb(hex2)
  return Math.sqrt((a.r-b.r)**2 + (a.g-b.g)**2 + (a.b-b.b)**2)
}

const NAMED_COLORS: Record<string, string> = {
  '#000000': 'black', '#222222': 'charcoal', '#444444': 'graphite', '#666666': 'slate', '#888888': 'gray',
  '#FFFFFF': 'white', '#F2F2F2': 'off white',
  '#C0392B': 'red', '#D35400': 'orange', '#F39C12': 'amber', '#27AE60': 'green', '#16A085': 'teal',
  '#2980B9': 'blue', '#8E44AD': 'purple', '#E67E22': 'rust', '#B87333': 'copper', '#A0522D': 'brown',
}
const NAMED_KEYS = Object.keys(NAMED_COLORS)
function nameNearestColor(hex: string) {
  let best = NAMED_KEYS[0]
  let bestD = Infinity
  for (const key of NAMED_KEYS) {
    const d = colorDistance(hex, key)
    if (d < bestD) { bestD = d; best = key }
  }
  return NAMED_COLORS[best]
}

async function extractDominantColor(file: File): Promise<string> {
  const img = document.createElement('img')
  img.src = URL.createObjectURL(file)
  await new Promise(res => { img.onload = () => res(null) })  // type: ignore
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!
  const W = 80, H = 80
  canvas.width = W; canvas.height = H
  ctx.drawImage(img, 0, 0, W, H)
  let r=0,g=0,b=0, n=0
  const step = 5
  const data = ctx.getImageData(0,0,W,H).data
  for (let y=0; y<H; y+=step) {
    for (let x=0; x<W; x+=step) {
      const i = (y*W + x) * 4
      r += data[i]; g += data[i+1]; b += data[i+2]; n++
    }
  }
  r = Math.round(r/n); g = Math.round(g/n); b = Math.round(b/n)
  return rgbToHex(r,g,b)
}

function guessTypeFromFilename(name: string): GarmentType {
  const n = name.toLowerCase()
  if (/dress|gown/.test(n)) return 'dress'
  if (/coat|jacket|hoodie|blazer|parka/.test(n)) return 'outerwear'
  if (/jean|pant|trouser|short/.test(n)) return 'bottom'
  if (/shoe|sneaker|boot|heel|loafer/.test(n)) return 'shoes'
  if (/belt|hat|cap|scarf|bag/.test(n)) return 'accessory'
  return 'top'
}

function saveLocal<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}
function loadLocal<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback } catch { return fallback }
}

function buildRules(profile: CustomerProfile) {
  const goals: FitGoal[] = []
  if (profile.bodyType === 'rectangle') goals.push('accentuateWaist')
  if (profile.bodyType === 'triangle') goals.push('accentuateShoulders', 'elongate')
  if (profile.bodyType === 'invertedTriangle') goals.push('minimizeHips', 'balance')
  if (profile.bodyType === 'hourglass') goals.push('accentuateWaist')
  if (profile.bodyType === 'oval') goals.push('elongate', 'relaxed')
  return goals
}
function isColorFriendly(hex: string, profile: CustomerProfile) {
  const undertone = profile.skinUndertone
  if (!undertone) return true // type: ignore
  const coolFriendly = ['blue','purple','charcoal','graphite','white','teal']
  const warmFriendly = ['rust','amber','copper','brown','green','off white']
  const name = nameNearestColor(hex)
  return undertone === 'cool' ? coolFriendly.includes(name) : undertone === 'warm' ? warmFriendly.includes(name) : true
}

function mixAndMatch(garments: Garment[], profile: CustomerProfile) {
  const tops = garments.filter(g=>g.type==='top')
  const bottoms = garments.filter(g=>g.type==='bottom')
  const dresses = garments.filter(g=>g.type==='dress')
  const outers = garments.filter(g=>g.type==='outerwear')
  const shoes = garments.filter(g=>g.type==='shoes')
  const accessories = garments.filter(g=>g.type==='accessory')
  const rules = buildRules(profile)

  const combos: {items: Garment[]; rationale: string[]}[] = []

  dresses.slice(0,6).forEach(d => {
    const layer = outers.find(o=> colorDistance(o.colorHex, d.colorHex) > 90)
    const shoe = shoes.find(s=> colorDistance(s.colorHex, d.colorHex) > 60)
    if (shoe) {
      const rationale = [
        'Dress as one-and-done base',
        layer ? `Layer adds structure (${nameNearestColor(layer.colorHex)} vs ${nameNearestColor(d.colorHex)})` : 'Minimal layering to elongate line',
        'Shoes chosen for contrast',
      ]
      combos.push({ items: [d, ...(layer?[layer]:[]), shoe], rationale })
    }
  })

  tops.slice(0,8).forEach(t => {
    const bottom = bottoms.find(b => colorDistance(b.colorHex, t.colorHex) > 80)
    if (!bottom) return
    const layer = outers.find(o => colorDistance(o.colorHex, t.colorHex) > 90)
    const shoe = shoes.find(s => colorDistance(s.colorHex, bottom.colorHex) > 60)

    const rationale: string[] = [
      `Top (${nameNearestColor(t.colorHex)}) with ${nameNearestColor(bottom.colorHex)} bottom for contrast`,
    ]
    if (rules.includes('accentuateWaist')) rationale.push('Tuck or belt to define waistline')
    if (rules.includes('elongate')) rationale.push('Monochromatic column from top to shoe to elongate silhouette')
    if (rules.includes('accentuateShoulders')) rationale.push('Structured shoulder or boat-neck to broaden upper body')

    const items = [t, bottom, ...(layer?[layer]:[]), ...(shoe?[shoe]:[])]
    combos.push({ items, rationale })
  })

  const filtered = combos.filter(c => c.items.every(i =>
    (!profile.dislikedColors || !profile.dislikedColors.includes(nameNearestColor(i.colorHex))) &&
    (!profile.favoriteColors || profile.favoriteColors.length===0 || profile.favoriteColors.includes(nameNearestColor(i.colorHex))) &&
    isColorFriendly(i.colorHex, profile)
  ))

  const uniq: typeof filtered = []
  const seen = new Set<string>()
  for (const c of filtered) {
    const key = c.items.map(i=>i.id).sort().join('-')
    if (!seen.has(key)) { seen.add(key); uniq.push(c) }
  }
  return uniq.slice(0, 12)
}

export default function App() {
  const [theme, setTheme] = useState<'light'|'dark'>(() => (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light')
  useEffect(()=>{ document.documentElement.classList.toggle('dark', theme==='dark') }, [theme])

  const [profile, setProfile] = useState<CustomerProfile>(() => loadLocal<CustomerProfile>('vc_profile', { preferredStyles: ['classic', 'minimalist'], formalityScale: 3 }))
  const [garments, setGarments] = useState<Garment[]>(() => loadLocal<Garment[]>('vc_garments', []))
  const [filter, setFilter] = useState<{type?: GarmentType|'all'; color?: string; q?: string}>({ type: 'all' })

  useEffect(()=> saveLocal('vc_profile', profile), [profile])
  useEffect(()=> saveLocal('vc_garments', garments), [garments])

  const filteredGarments = useMemo(() => garments.filter(g => {
    if (filter.type && filter.type!=='all' && g.type!==filter.type) return false
    if (filter.color && nameNearestColor(g.colorHex)!==filter.color) return false
    if (filter.q && !(`${g.name} ${g.tags.join(' ')}`.toLowerCase().includes(filter.q.toLowerCase()))) return false
    return true
  }), [garments, filter])

  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFiles(files: FileList | null) {
    if (!files) return
    const newItems: Garment[] = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue
      const colorHex = await extractDominantColor(file)
      const imageDataUrl = await new Promise<string>((res) => {
        const reader = new FileReader(); reader.onload = () => res(reader.result as string); reader.readAsDataURL(file)
      })
      newItems.push({
        id: uid(),
        name: file.name.replace(/\.[^.]+$/, ''),
        type: guessTypeFromFilename(file.name),
        colorHex,
        colorName: nameNearestColor(colorHex),
        imageDataUrl,
        tags: [],
      })
    }
    setGarments(prev => [...newItems, ...prev])
  }

  function removeGarment(id: string) { setGarments(prev => prev.filter(g => g.id!==id)) }
  function updateGarment(id: string, patch: Partial<Garment>) {
    setGarments(prev => prev.map(g => g.id===id ? {...g, ...patch} : g))
  }

  const suggestions = useMemo(() => mixAndMatch(garments, profile), [garments, profile])

  function resetAll() {
    if (confirm('Clear wardrobe and profile?')) {
      setGarments([]); setProfile({ preferredStyles: ['classic'], formalityScale: 3 })
      localStorage.removeItem('vc_garments'); localStorage.removeItem('vc_profile')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 text-gray-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow"><Shirt size={20}/></div>
            <div>
              <h1 className="text-2xl md:text-3xl font-semibold">Virtual Closet</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Snap, classify, and get AI outfit suggestions.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={()=>setTheme(t=>t==='light'?'dark':'light')} title="Toggle theme"><Sun className="hidden dark:block" size={18}/><Moon className="dark:hidden" size={18}/> Theme</Button>
            <Button onClick={resetAll} title="Reset all"><RefreshCw size={16}/> Reset</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent>
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={()=>fileInputRef.current?.click()}><Upload size={16}/> Upload photos</Button>
                  <Input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*" onChange={e=>handleFiles(e.target.files)} />
                  <Badge><Filter size={12}/> Filter</Badge>
                  <Select value={filter.type} onChange={e=>setFilter(f=>({...f, type: e.target.value as any}))} className="w-40">
                    <option value="all">All types</option>
                    <option value="top">Top</option>
                    <option value="bottom">Bottom</option>
                    <option value="dress">Dress</option>
                    <option value="outerwear">Outerwear</option>
                    <option value="shoes">Shoes</option>
                    <option value="accessory">Accessory</option>
                  </Select>
                  <Select value={filter.color||''} onChange={e=>setFilter(f=>({...f, color: e.target.value || undefined}))} className="w-40">
                    <option value="">Any color</option>
                    {Object.keys(NAMED_COLORS).map(k=> <option key={k} value={NAMED_COLORS[k]}>{NAMED_COLORS[k]}</option>)}
                  </Select>
                  <Input placeholder="Search name or tags" value={filter.q||''} onChange={e=>setFilter(f=>({...f, q: e.target.value}))} style={{maxWidth:280}}/>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Palette size={18}/> Wardrobe</h2>
                {filteredGarments.length===0 ? (
                  <p className="text-sm text-gray-500">No items yet. Upload photos to start building your closet.</p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredGarments.map(g => (
                      <motion.div key={g.id} layout initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} className="group">
                        <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white">
                          <img src={g.imageDataUrl} alt={g.name} className="aspect-square object-cover"/>
                          <div className="absolute top-2 right-2 flex gap-1">
                            <button onClick={()=>removeGarment(g.id)} className="p-1.5 rounded-full bg-white/90 hover:bg-white shadow"><Trash2 size={14}/></button>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <Input value={g.name} onChange={e=>updateGarment(g.id, {name: e.target.value})} />
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <Select value={g.type} onChange={e=>updateGarment(g.id, {type: e.target.value as GarmentType})}>
                            <option value="top">Top</option>
                            <option value="bottom">Bottom</option>
                            <option value="dress">Dress</option>
                            <option value="outerwear">Outerwear</option>
                            <option value="shoes">Shoes</option>
                            <option value="accessory">Accessory</option>
                          </Select>
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-xl border" style={{background:g.colorHex}} title={g.colorHex}></div>
                            <Input value={g.colorName} onChange={e=>updateGarment(g.id, {colorName: e.target.value})} />
                          </div>
                        </div>
                        <div className="mt-2">
                          <Input placeholder="Tags (comma separated)" value={g.tags.join(', ')} onChange={e=>updateGarment(g.id, {tags: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)})} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Ruler size={18}/> Your Profile</h2>
                <div className="grid grid-cols-1 gap-3">
                  <Input placeholder="Name" value={profile.name||''} onChange={e=>setProfile(p=>({...p, name: e.target.value}))}/>
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={profile.bodyType||''} onChange={e=>setProfile(p=>({...p, bodyType: e.target.value as any}))}>
                      <option value="">Body type</option>
                      <option value="rectangle">Rectangle</option>
                      <option value="triangle">Triangle</option>
                      <option value="invertedTriangle">Inverted Triangle</option>
                      <option value="hourglass">Hourglass</option>
                      <option value="oval">Oval</option>
                    </Select>
                    <Select value={profile.skinUndertone||''} onChange={e=>setProfile(p=>({...p, skinUndertone: e.target.value as any}))}>
                      <option value="">Skin undertone</option>
                      <option value="cool">Cool</option>
                      <option value="warm">Warm</option>
                      <option value="neutral">Neutral</option>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={profile.formalityScale||3} onChange={e=>setProfile(p=>({...p, formalityScale: Number(e.target.value) as any}))}>
                      <option value={1}>Very casual</option>
                      <option value={2}>Casual</option>
                      <option value={3}>Smart casual</option>
                      <option value={4}>Business</option>
                      <option value={5}>Formal</option>
                    </Select>
                    <Input type="number" placeholder="Height (cm)" value={profile.heightCm||''} onChange={e=>setProfile(p=>({...p, heightCm: Number(e.target.value)}))}/>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Preferred styles</label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(['classic','minimalist','sporty','street','elegant','boho','edgy','preppy'] as StyleVibe[]).map(s => (
                        <button key={s} onClick={()=> setProfile(p=> ({...p, preferredStyles: p.preferredStyles.includes(s) ? p.preferredStyles.filter(x=>x!==s) : [...p.preferredStyles, s]}))} className={`px-3 py-1.5 rounded-full border ${profile.preferredStyles.includes(s) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white hover:bg-gray-50'}`}>{s}</button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Favorite colors (names, comma)" value={(profile.favoriteColors||[]).join(', ')} onChange={e=>setProfile(p=>({...p, favoriteColors: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))}/>
                    <Input placeholder="Disliked colors (names, comma)" value={(profile.dislikedColors||[]).join(', ')} onChange={e=>setProfile(p=>({...p, dislikedColors: e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))}/>
                  </div>
                  <TextArea placeholder="Anything to avoid (fits, fabrics, contexts)…" value={profile.avoidNotes||''} onChange={e=>setProfile(p=>({...p, avoidNotes: e.target.value}))}/>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Wand2 size={18}/> AI Suggestions</h2>
                {suggestions.length===0 ? (
                  <p className="text-sm text-gray-500">Add at least 1 top and 1 bottom, or a dress + shoes, to see outfit ideas.</p>
                ) : (
                  <div className="space-y-4">
                    {suggestions.map((sug, idx) => (
                      <div key={idx} className="rounded-2xl border border-gray-200 overflow-hidden">
                        <div className="grid grid-cols-5 gap-0">
                          {sug.items.map((item,i)=> (
                            <div key={i} className="col-span-1 bg-white">
                              <img src={item.imageDataUrl} className="aspect-square object-cover"/>
                              <div className="p-2 text-xs flex items-center justify-between">
                                <span className="truncate">{item.name}</span>
                                <span className="px-2 py-0.5 rounded-full border bg-gray-50">{item.type}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="p-3 text-sm bg-gray-50">
                          <div className="flex flex-wrap gap-2">
                            {sug.rationale.map((r,i)=>(<Badge key={i}><Sparkles size={12}/>{r}</Badge>))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-4 text-xs text-gray-500">
                  <p>These suggestions use a simple rules engine based on your body type, color harmony, and style preferences. In production, swap in a server-side classifier (vision model for garment detection + color clustering) and an LLM prompt that respects brand guidelines and personal branding constraints.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><Sparkles size={18}/> Roadmap to Production</h2>
                <ol className="list-decimal pl-5 space-y-2 text-sm">
                  <li><strong>Image ingestion:</strong> camera capture, background removal, auto rotate.</li>
                  <li><strong>Vision classification:</strong> type detection via a small CNN or a hosted vision API; dominant color via k-means; pattern flag.</li>
                  <li><strong>User model:</strong> richer measurements (torso:leg ratio), events calendar, climate, and dress code profiles.</li>
                  <li><strong>Recommendation engine:</strong> color theory + fit goals + occasion; exploration vs. exploitation for novelty.</li>
                  <li><strong>Personal branding layer:</strong> encode brand attributes into styling prompts; generate rationale in natural language.</li>
                  <li><strong>Analytics:</strong> A/B test acceptance rate of outfits; wardrobe gaps detection and shopping suggestions.</li>
                  <li><strong>Sync:</strong> iCloud/Drive backup, sign-in, multi-device.</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-gray-500">
          Built with Vite + React + TS. Replace UI primitives with your design system and wire APIs where indicated.
        </footer>
      </div>

      <style>{`
        :root { color-scheme: light dark; }
        .dark .bg-white { background-color: #0B0B0C; }
        .dark .text-gray-900 { color: #F5F5F6; }
        .dark .border-gray-200 { border-color: #1F1F22; }
        .dark .bg-gray-50 { background-color: #121214; }
        .dark .shadow-sm { box-shadow: 0 1px 2px rgba(0,0,0,0.3); }
      `}</style>
    </div>
  )
}
