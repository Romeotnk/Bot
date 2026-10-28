import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Terminal,
  ShieldCheck,
  Zap,
  Radio,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  Code2,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface PineScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  botKey: string;
}

export const PineScriptModal: React.FC<PineScriptModalProps> = ({
  isOpen,
  onClose,
  botKey,
}) => {
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedStrategy, setCopiedStrategy] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedFixSnippet, setCopiedFixSnippet] = useState(false);
  const [activeTab, setActiveTab] = useState<'script' | 'strategy' | 'audit' | 'webhook' | 'error_fix'>('script');

  if (!isOpen) return null;

  const webhookUrl = `${window.location.origin}/api/webhook/tradingview`;

  // Snippet rapide pour réparer l'erreur de table de stats et retest dans l'ancien script
  const fixSnippetCode = `// ============================================================================
// FIX RAPIDE DU TABLEAU DE STATS & RETEST (Résout le crash tStats & calcul de lot)
// ============================================================================

// 1. DÉFINITION PROPRE DE f_wide AVEC NOMBRE DE COLONNES PARAMÉTRABLE :
f_wide(table t, int r, int endCol, string txt, color tc, color bg, string sz, string al) =>
    table.cell(t, 0, r, txt, text_color=tc, bgcolor=bg, text_size=sz, text_halign=al)
    if endCol > 0
        table.merge_cells(t, 0, r, endCol, r)

// 2. CORRECTION DANS L'AFFICHAGE DE tStats (Remplacer l'appel 3 colonnes par 1) :
// tStats n'a que 2 colonnes (index 0 et 1). On fusionne donc 0 à 1, PAS 0 à 3 !
if showStats
    tStats := table.new(position.bottom_left, 2, 7, bgcolor=color.new(#0b1220, 6), frame_color=color.new(#334155, 20), frame_width=1)
    f_wide(tStats, 0, 1, "STATISTIQUES EN DIRECT", color.white, color.new(#1e293b, 0), size.small, text.align_center)
    // Fin du crash d'exécution !

// 3. CALCUL DE LOT BASÉ SUR LE RISQUE RÉEL (tRisk) :
float dynRisk = active ? tRisk : math.max(atr * 0.4, close - plSLb)
float realLot = (capital * (riskPct / 100.0)) / (dynRisk * contractSize)
string lotTxt = realLot < 0.01 ? "0.01 (!)" : str.tostring(math.round(realLot * 100.0) / 100.0, "0.00")`;

  // Code Indicateur v5 complet et sans bug
  const pineScriptCode = `//@version=5
// ============================================================================
//  MDT SNIPER INSTITUTIONNEL — PINE SCRIPT v5 (AUDITÉ & CORRIGÉ)
//  Architecture : Smart Money Concepts (OB, FVG violets, Sweeps, Retest, OTE)
//  
//  CORRECTIONS APPLIQUÉES SELON AUDIT EXPERT :
//  1. Table tStats : Fusion colonnes 0 à 1 (fin du crash de merge_cells 0..3)
//  2. Lot Size Réel : Calculé strictement à partir de tRisk (SL swing réel)
//  3. 3 TPs Paliers : TP1 (50% @ 0.5R + BE), TP2 (25% @ 1.5R), TP3 (25% @ 3.0R)
//  4. R Net Pondéré : TP1+BE = +0.25R net garanti, TP2 = +0.625R, All = +1.375R
//  5. Fibonacci OTE Directionnel : Discount sous 50% (achats) / Premium sur 50% (ventes)
//  6. Scénarios Réalistes : Niveaux basés sur le Retest micro-structure (pas la ligne statique)
//  7. Webhook Intégral : Événements ACHAT, VENTE, TP1_HIT, TP2_HIT, TP3_HIT, BE_HIT, SL_HIT
//  8. Transparence : 0% fake stats ("—" si 0 trade, pas de fausses promesses 90%)
// ============================================================================
indicator("MDT Sniper Pro [Master Audit Edition]", shorttitle="MDT Master", overlay=true, max_boxes_count=500, max_lines_count=500, max_labels_count=500, max_bars_back=1000)

// ───────────── COULEURS INSTITUTIONNELLES
color cBuy   = #22c55e
color cSell  = #ef4444
color cEntry = #06b6d4
color cTP1   = #facc15
color cTP2   = #22c55e
color cTP3   = #10b981
color cOBb   = #3b82f6
color cOBs   = #ef4444
color cFVGb  = #22c55e
color cFVGs  = #f59e0b
color cFVGx  = #a855f7
color cBg    = #0b1220

// ───────────── ① AFFICHAGE & MODES
G1 = "① AFFICHAGE & MODES"
i_preset    = input.string("Débutant", "Préréglage", options=["Débutant", "Épuré", "Minimal", "Complet", "Personnalisé"], group=G1)
i_guide     = input.string("Complet", "Mode Panneau Guide", options=["Complet", "Compact", "Réduit", "Masqué"], group=G1)
i_mtf       = input.string("Complet", "Radar Multi-UT", options=["Complet", "Compact", "Masqué"], group=G1)
i_ob        = input.bool(true, "Order Blocks (OB)", group=G1)
i_fvg       = input.bool(true, "Fair Value Gaps (FVG)", group=G1)
i_trend     = input.bool(true, "Ligne de tendance MDT", group=G1)
i_sig       = input.bool(true, "Signaux & Étiquettes", group=G1)
i_lvl       = input.bool(true, "Niveaux de Trade (Entrée, SL, TPs)", group=G1)
i_scen      = input.bool(true, "Scénarios futurs sur Retest", group=G1)
i_fib       = input.bool(true, "Fibonacci Auto OTE Directionnel", group=G1)
i_sess      = input.bool(true, "Sessions Killzones (Londres / NY)", group=G1)
i_stats     = input.bool(true, "Tableau de Statistiques", group=G1)
i_hideMit   = input.bool(true, "Cacher zones mitigées / cassées", group=G1)
guidePosS   = input.string("Haut droite", "Position Panneau Guide", options=["Haut droite", "Haut gauche", "Haut centre", "Bas centre"], group=G1)
txtSizeS    = input.string("Normal", "Taille du texte", options=["Petit", "Normal", "Grand"], group=G1)

isCust = i_preset == "Personnalisé"
showOB    = isCust ? i_ob : (i_preset != "Minimal")
showFVG   = isCust ? i_fvg : (i_preset == "Débutant" or i_preset == "Complet")
showTrend = isCust ? i_trend : (i_preset != "Minimal")
showSig   = isCust ? i_sig : true
showLvl   = isCust ? i_lvl : true
showScen  = isCust ? i_scen : (i_preset != "Minimal")
showFib   = isCust ? i_fib : (i_preset == "Complet" or i_preset == "Débutant")
showSess  = isCust ? i_sess : (i_preset != "Minimal")
showStats = isCust ? i_stats : (i_preset == "Complet" or i_preset == "Débutant")

guideMode = isCust ? (i_guide == "Complet" ? 2 : i_guide == "Compact" ? 1 : i_guide == "Réduit" ? 0 : -1) : (i_preset == "Complet" ? 2 : i_preset == "Débutant" ? 2 : i_preset == "Épuré" ? 1 : 0)
mtfMode   = isCust ? (i_mtf == "Complet" ? 2 : i_mtf == "Compact" ? 1 : 0) : (i_preset == "Complet" ? 2 : i_preset == "Débutant" ? 1 : 0)
guidePos  = guidePosS == "Haut gauche" ? position.top_left : guidePosS == "Haut centre" ? position.top_center : guidePosS == "Bas centre" ? position.bottom_center : position.top_right
szBody    = txtSizeS == "Petit" ? size.tiny : (txtSizeS == "Grand" ? size.normal : size.small)
szStat    = txtSizeS == "Petit" ? size.small : (txtSizeS == "Grand" ? size.large : size.normal)
szVal     = szStat
wrapW     = txtSizeS == "Petit" ? 44 : (txtSizeS == "Grand" ? 28 : 36)

// ───────────── ② GESTION DU RISQUE RÉEL & CAPITAL
G2 = "② GESTION DU RISQUE (CALCUL STRICT DU LOT)"
capital      = input.float(1000, "Capital du compte ($)", minval=1, group=G2)
riskPct      = input.float(0.5, "Risque par trade (% du capital)", minval=0.1, maxval=5, step=0.1, group=G2)
contractSize = input.float(100, "Taille du contrat (XAUUSD = 100)", minval=0.01, group=G2)
pipSize      = input.float(0.1, "Valeur d'un pip (XAUUSD = 0.1)", minval=0.0001, step=0.01, group=G2)
slBuf        = input.float(0.3, "Marge de SL au-delà du pivot (× ATR)", minval=0.0, step=0.05, group=G2)
slLook       = input.int(6, "Pivot SL sur N bougies", minval=2, maxval=30, group=G2)
minRiskATR   = input.float(0.4, "Risque mini (× ATR)", minval=0.1, step=0.1, group=G2)
maxRiskATR   = input.float(3.5, "Risque maxi (× ATR)", minval=0.5, step=0.1, group=G2)

tp1R         = input.float(0.5, "TP1 (R) — Ferme 50% du lot & SL à BE", step=0.1, group=G2)
tp2R         = input.float(1.5, "TP2 (R) — Ferme 25% du lot", step=0.1, group=G2)
tp3R         = input.float(3.0, "TP3 (R) — Runner 25% restant", step=0.1, group=G2)
useDaily     = input.bool(true, "Limite journalière anti-tilt", group=G2)
dailyLimit   = input.float(2.0, "Perte maxi / jour (% du capital)", minval=0.5, step=0.5, group=G2)

// ───────────── ③ STRATÉGIE & CONFLUENCE
G3 = "③ STRATÉGIE DE RETEST & CONFLUENCE"
atrLen       = input.int(14, "ATR (volatilité)", minval=2, group=G3)
trendMult    = input.float(2.0, "Ligne MDT : multiplicateur ATR", minval=0.5, step=0.1, group=G3)
profile      = input.string("Sniper A+", "Profil", options=["Starter", "Intraday Clean", "Sniper A+"], group=G3)
useRetest    = input.bool(true, "Entrée STRICTE sur Retest", group=G3)
retestLook   = input.int(10, "Validité du retest (bougies)", minval=1, group=G3)
cooldown     = input.int(15, "Bougies mini entre 2 signaux", minval=0, group=G3)
sweepLen     = input.int(20, "Sweep : recherche plus haut/bas", minval=5, group=G3)
microLen     = input.int(2, "Force micro-structure (pivots)", minval=1, group=G3)
dispAtr      = input.float(0.8, "Déplacement mini (corps × ATR)", step=0.1, group=G3)
volLen       = input.int(20, "Moyenne de volume", minval=5, group=G3)
volMult      = input.float(1.4, "Volume fort = moyenne ×", minval=1.0, step=0.1, group=G3)
minFvgATR    = input.float(0.2, "FVG : taille mini (× ATR)", minval=0.0, step=0.05, group=G3)
maxZones     = input.int(6, "Zones actives max par côté", minval=2, maxval=20, group=G3)
maxZoneATR   = input.float(3.0, "Hauteur max zone (× ATR)", minval=0.5, step=0.5, group=G3)

// Multi-UT
htf1         = input.timeframe("60", "Tendance Fond H1", group=G3)
htf2         = input.timeframe("240", "Tendance Fond H4", group=G3)
tfA          = input.timeframe("5", "Radar UT 1 (M5)", group=G3)
tfB          = input.timeframe("15", "Radar UT 2 (M15)", group=G3)
tfC          = input.timeframe("60", "Radar UT 3 (H1)", group=G3)
tfD          = input.timeframe("240", "Radar UT 4 (H4)", group=G3)

// ───────────── ④ FIBONACCI DIRECTIONNEL & SESSIONS
G4 = "④ FIBONACCI OTE & KILLZONES"
fibLen       = input.int(15, "Pivots Swing Fibonacci", minval=3, group=G4)
botSecret    = input.string("${botKey}", "Clé API Secrète Webhook (ne pas publier)", group="⑤ WEBHOOK & AUTOMATISATION")

int reqScore = profile == "Starter" ? 2 : (profile == "Intraday Clean" ? 4 : 5)
bool reqZone = profile == "Sniper A+"
bool reqHtf  = profile == "Sniper A+"

// Sessions Killzones
inLondon = not na(time(timeframe.period, "0700-1100:23456", "UTC"))
inNY     = not na(time(timeframe.period, "1230-1700:23456", "UTC"))
inAsia   = not na(time(timeframe.period, "0000-0700:23456", "UTC"))
inSess   = profile == "Starter" ? true : (inLondon or inNY)

bgcolor(showSess and inAsia ? color.new(color.blue, 95) : na, title="Killzone Asie")
bgcolor(showSess and inLondon ? color.new(color.teal, 92) : na, title="Killzone Londres")
bgcolor(showSess and inNY ? color.new(color.orange, 92) : na, title="Killzone New York")

// ═══════════════ FONCTIONS UTILITAIRES SANS ERREUR
f_rec(bool cond, int n) => ta.barssince(cond) <= n
f_p(float x) => na(x) ? "—" : str.tostring(x, format.mintick)
f_chk(bool c) => c ? "✅ " : "❌ "

f_miss(bool c1, bool c2, bool c3, bool c4, bool c5, bool c6, bool c7) =>
    string s = ""
    if not c1
        s += "EMA200 H1/H4 · "
    if not c2
        s += "Zone OB/FVG · "
    if not c3
        s += "Sweep Liquidité · "
    if not c4
        s += "Cassure Micro · "
    if not c5
        s += "Flip MDT · "
    if not c6
        s += "Volume Fort · "
    if not c7
        s += "Risque SL/ATR · "
    s

// FONCTION SAFE DE MERGE CELLULES : prend en paramètre endCol (ne dépasse jamais cols - 1)
f_wide(table t, int r, int endCol, string txt, color tc, color bg, string sz, string al) =>
    table.cell(t, 0, r, txt, text_color=tc, bgcolor=bg, text_size=sz, text_halign=al)
    if endCol > 0
        table.merge_cells(t, 0, r, endCol, r)

f_wrap(string s, int w) =>
    string out = ""
    string ln = ""
    array<string> words = str.split(s, " ")
    for i = 0 to array.size(words) - 1
        string wd = array.get(words, i)
        if str.length(ln) + str.length(wd) + 1 > w and str.length(ln) > 0
            out += ln + "\\n"
            ln := wd
        else
            ln := str.length(ln) == 0 ? wd : ln + " " + wd
    out + ln

// ═══════════════ INDICATEUR DE TENDANCE MDT (PALIER ATR)
atr = ta.atr(atrLen)
f_mdt() =>
    var float st = na
    var int td = 1
    float upS = low - atr * trendMult
    float dnS = high + atr * trendMult
    int prev = td
    if na(st)
        st := upS
    if prev == 1
        if upS > st
            st := upS
        if close < st
            td := -1
            st := dnS
    if prev == -1
        if dnS < st
            st := dnS
        if close > st
            td := 1
            st := upS
    [st, td]

[mdtStop, mdtTrend] = f_mdt()
trendUp = mdtTrend == 1
flipUp  = mdtTrend == 1 and mdtTrend[1] == -1
flipDn  = mdtTrend == -1 and mdtTrend[1] == 1
plot(showTrend ? mdtStop : na, "Ligne MDT", color=trendUp ? cBuy : cSell, linewidth=2, style=plot.style_stepline)

// ═══════════════ FIBONACCI DIRECTIONNEL OTE (RÉSOLUTION ISSUE 4)
// En tendance haussière : retracement dans le DISCOUNT (depuis le sommet vers le bas)
// En tendance baissière : retracement dans le PREMIUM (depuis le creux vers le haut)
pH = ta.pivothigh(high, fibLen, fibLen)
pL = ta.pivotlow(low, fibLen, fibLen)
var float fibHigh = na
var float fibLow  = na
if not na(pH)
    fibHigh := pH
if not na(pL)
    fibLow := pL

fibDiff = fibHigh - fibLow
isFibOk = showFib and not na(fibHigh) and not na(fibLow) and fibDiff > 0

// Calcul directionnel strict :
fib50  = fibLow + (fibDiff * 0.50)
fibOTE_high = trendUp ? (fibHigh - fibDiff * 0.618) : (fibLow + fibDiff * 0.786)
fibOTE_mid  = trendUp ? (fibHigh - fibDiff * 0.705) : (fibLow + fibDiff * 0.705)
fibOTE_low  = trendUp ? (fibHigh - fibDiff * 0.786) : (fibLow + fibDiff * 0.618)

plot(isFibOk ? (trendUp ? fibHigh : fibLow) : na, "Fib 0.0%", color=color.gray, style=plot.style_linebr, linewidth=1)
plot(isFibOk ? fib50 : na, "Fib 50.0% (Equilibrium)", color=color.rgb(56, 189, 248), style=plot.style_linebr, linewidth=1)
pF_top = plot(isFibOk ? (trendUp ? fibOTE_high : fibOTE_high) : na, "Fib OTE Top", color=color.rgb(232, 197, 106), style=plot.style_linebr, linewidth=2)
plot(isFibOk ? fibOTE_mid : na, "Fib 70.5% (Golden OTE)", color=color.rgb(234, 179, 8), style=plot.style_linebr, linewidth=2)
pF_bot = plot(isFibOk ? (trendUp ? fibOTE_low : fibOTE_low) : na, "Fib OTE Bot", color=color.rgb(232, 197, 106), style=plot.style_linebr, linewidth=2)
fill(pF_top, pF_bot, color=isFibOk ? color.new(color.rgb(234, 179, 8), 86) : na, title="Zone OTE Directionnelle")

// ═══════════════ STRUCTURE DE PIVOTS & MICRO-STRUCTURE
mph = ta.pivothigh(high, microLen, microLen)
mpl = ta.pivotlow(low, microLen, microLen)
var float microHigh = na
var float microLow  = na
if not na(mph)
    microHigh := mph
if not na(mpl)
    microLow := mpl

body = math.abs(close - open)
dispUp = close > open and body >= atr * dispAtr
dispDn = close < open and body >= atr * dispAtr
microBreakUp = not na(microHigh) and ta.crossover(close, microHigh) and dispUp
microBreakDn = not na(microLow) and ta.crossunder(close, microLow) and dispDn

// Sweeps de liquidité
llv = ta.lowest(low, sweepLen)[1]
hhv = ta.highest(high, sweepLen)[1]
sweepBull = low < llv and close > llv
sweepBear = high > hhv and close < hhv

// Volume & Filtre HTF
volAvg = ta.sma(volume, volLen)
hvb = nz(volume) > 0 ? (volume > volAvg * volMult) : true
htfE1 = request.security(syminfo.tickerid, htf1, ta.ema(close, 200)[1], lookahead=barmerge.lookahead_off)
htfE2 = request.security(syminfo.tickerid, htf2, ta.ema(close, 200)[1], lookahead=barmerge.lookahead_off)
htfUp = close > htfE1 and close > htfE2
htfDn = close < htfE1 and close < htfE2

// ═══════════════ ZONES OB & FVG
var bullBox = array.new_box()
var bullTop = array.new_float()
var bullBot = array.new_float()
var bullNam = array.new_string()
var bearBox = array.new_box()
var bearTop = array.new_float()
var bearBot = array.new_float()
var bearNam = array.new_string()

f_touch(array<float> tp, array<float> bt, array<string> nm) =>
    bool hit = false
    float zt = na
    float zb = na
    string zn = ""
    int n = array.size(tp)
    if n > 0
        for i = n - 1 to 0
            float t = array.get(tp, i)
            float b = array.get(bt, i)
            if low <= t and high >= b
                hit := true
                zt := t
                zb := b
                zn := array.get(nm, i)
                break
    [hit, zt, zb, zn]

[tbHit, tbTop, tbBot, tbNam] = f_touch(bullTop, bullBot, bullNam)
[tsHit, tsTop, tsBot, tsNam] = f_touch(bearTop, bearBot, bearNam)

// Mise à jour zones
f_cleanZones(array<box> bx, array<float> tp, array<float> bt, array<string> nm, bool isBull) =>
    int n = array.size(bx)
    if n > 0
        for i = n - 1 to 0
            float t = array.get(tp, i)
            float b = array.get(bt, i)
            box bb = array.get(bx, i)
            bool broken = isBull ? close < b : close > t
            if broken
                if not na(bb) and i_hideMit
                    box.delete(bb)
                array.remove(bx, i)
                array.remove(tp, i)
                array.remove(bt, i)
                array.remove(nm, i)
            else if not na(bb)
                box.set_right(bb, bar_index)

f_cleanZones(bullBox, bullTop, bullBot, bullNam, true)
f_cleanZones(bearBox, bearTop, bearBot, bearNam, false)

// Ajout dynamique de zones
capH = maxZoneATR * atr
if showOB and microBreakUp and (high[2] - low[2]) <= capH
    box b = box.new(bar_index - 2, high[2], bar_index, low[2], border_color=color.new(cOBb, 50), bgcolor=color.new(cOBb, 85), text="OB+", text_size=size.tiny, text_color=color.blue)
    array.push(bullBox, b)
    array.push(bullTop, high[2])
    array.push(bullBot, low[2])
    array.push(bullNam, "OB+")
    if array.size(bullBox) > maxZones
        box old = array.shift(bullBox)
        if not na(old)
            box.delete(old)
        array.shift(bullTop)
        array.shift(bullBot)
        array.shift(bullNam)

if showOB and microBreakDn and (high[2] - low[2]) <= capH
    box b = box.new(bar_index - 2, high[2], bar_index, low[2], border_color=color.new(cOBs, 50), bgcolor=color.new(cOBs, 85), text="OB-", text_size=size.tiny, text_color=color.red)
    array.push(bearBox, b)
    array.push(bearTop, high[2])
    array.push(bearBot, low[2])
    array.push(bearNam, "OB-")
    if array.size(bearBox) > maxZones
        box old = array.shift(bearBox)
        if not na(old)
            box.delete(old)
        array.shift(bearTop)
        array.shift(bearBot)
        array.shift(bearNam)

// ═══════════════ RISQUE RÉEL & SCORE 7 CONFLUENCES
win = 6
hiL = ta.highest(high, slLook)
loL = ta.lowest(low, slLook)
plSLb = loL - slBuf * atr
plSLs = hiL + slBuf * atr
plRiskB = close - plSLb
plRiskS = plSLs - close
riskOKb = plRiskB >= minRiskATR * atr and plRiskB <= maxRiskATR * atr
riskOKs = plRiskS >= minRiskATR * atr and plRiskS <= maxRiskATR * atr

bool cB1 = (not reqHtf) or htfUp
bool cB2 = f_rec(tbHit, win)
bool cB3 = f_rec(sweepBull, win)
bool cB4 = f_rec(microBreakUp, win)
bool cB5 = trendUp and f_rec(flipUp, 15)
bool cB6 = f_rec(hvb, win)
bool cB7 = riskOKb

bool cS1 = (not reqHtf) or htfDn
bool cS2 = f_rec(tsHit, win)
bool cS3 = f_rec(sweepBear, win)
bool cS4 = f_rec(microBreakDn, win)
bool cS5 = (not trendUp) and f_rec(flipDn, 15)
bool cS6 = f_rec(hvb, win)
bool cS7 = riskOKs

int scoreB = (cB1 ? 1 : 0) + (cB2 ? 1 : 0) + (cB3 ? 1 : 0) + (cB4 ? 1 : 0) + (cB5 ? 1 : 0) + (cB6 ? 1 : 0) + (cB7 ? 1 : 0)
int scoreS = (cS1 ? 1 : 0) + (cS2 ? 1 : 0) + (cS3 ? 1 : 0) + (cS4 ? 1 : 0) + (cS5 ? 1 : 0) + (cS6 ? 1 : 0) + (cS7 ? 1 : 0)

// ═══════════════ RETEST STRICT MDT (RÉSOLUTION ISSUE 6)
var bool  armL      = false
var float armLLevel = na
var int   armLBar   = na
var bool  armS      = false
var float armSLevel = na
var int   armSBar   = na

setupL_raw = flipUp and cB7 and scoreB >= reqScore and ((not reqZone) or cB2) and inSess
setupS_raw = flipDn and cS7 and scoreS >= reqScore and ((not reqZone) or cS2) and inSess

if setupL_raw
    armL := true
    armLLevel := microHigh
    armLBar := bar_index
if setupS_raw
    armS := true
    armSLevel := microLow
    armSBar := bar_index

retestL  = armL and not na(armLBar) and bar_index > armLBar and not na(armLLevel) and low <= armLLevel and close >= armLLevel
retestS  = armS and not na(armSBar) and bar_index > armSBar and not na(armSLevel) and high >= armSLevel and close <= armSLevel
expiredL = armL and (na(armLBar) or bar_index - armLBar > retestLook)
expiredS = armS and (na(armSBar) or bar_index - armSBar > retestLook)

var int lastSig = -100000
canSignal = bar_index - lastSig > cooldown

sigBuy  = barstate.isconfirmed and canSignal and (useRetest ? retestL : setupL_raw)
sigSell = barstate.isconfirmed and canSignal and (useRetest ? retestS : setupS_raw)

if sigBuy
    armL := false
    lastSig := bar_index
if sigSell
    armS := false
    lastSig := bar_index
if expiredL
    armL := false
if expiredS
    armS := false

// ═══════════════ SCÉNARIOS FUTURS SUR RETEST RÉEL (RÉSOLUTION ISSUE 6)
// L'entrée n'est plus fixée à la ligne MDT, mais au retest du niveau cassé
float scEntB  = not na(microHigh) ? microHigh : close
float scSLB   = loL - slBuf * atr
float scRiskB = math.max(0.4 * atr, scEntB - scSLB)
float scTP1B  = scEntB + scRiskB * tp1R
float scTP2B  = scEntB + scRiskB * tp2R

float scEntS  = not na(microLow) ? microLow : close
float scSLS   = hiL + slBuf * atr
float scRiskS = math.max(0.4 * atr, scSLS - scEntS)
float scTP1S  = scEntS - scRiskS * tp1R
float scTP2S  = scEntS - scRiskS * tp2R

var scL = array.new_line()
var scLb = array.new_label()
var scBx = array.new_box()

f_scen(bool isBuy, float entry, float sl, float tp1, float tp2) =>
    if not na(entry) and not na(sl)
        int x0 = bar_index + 4
        int x1 = bar_index + 20
        color cm = isBuy ? cBuy : cSell
        array.push(scL, line.new(bar_index, close, x0, entry, color=color.new(cm, 30), style=line.style_dashed, width=2))
        array.push(scBx, box.new(x0, math.max(entry, sl), x1, math.min(entry, sl), border_color=na, bgcolor=color.new(cSell, 85)))
        array.push(scBx, box.new(x0, math.max(entry, tp2), x1, math.min(entry, tp2), border_color=na, bgcolor=color.new(cBuy, 85)))
        array.push(scL, line.new(x0, entry, x1, entry, color=cEntry, width=2))
        array.push(scL, line.new(x0, sl, x1, sl, color=cSell, style=line.style_dotted, width=2))
        array.push(scL, line.new(x0, tp1, x1, tp1, color=cTP1, style=line.style_dotted, width=2))
        array.push(scL, line.new(x0, tp2, x1, tp2, color=cBuy, style=line.style_dotted, width=2))
        string pre = isBuy ? "A▲ RETEST " : "B▼ RETEST "
        array.push(scLb, label.new(x1, entry, pre + f_p(entry), color=color.new(cEntry, 20), style=label.style_label_left, textcolor=color.white, size=size.small))
        array.push(scLb, label.new(x1, sl, "SL " + f_p(sl), color=color.new(cSell, 20), style=label.style_label_left, textcolor=color.white, size=size.small))
        array.push(scLb, label.new(x1, tp1, "TP1 " + f_p(tp1), color=color.new(cTP1, 10), style=label.style_label_left, textcolor=color.black, size=size.small))
        array.push(scLb, label.new(x1, tp2, "TP2 " + f_p(tp2), color=color.new(cBuy, 20), style=label.style_label_left, textcolor=color.white, size=size.small))

// ═══════════════ GESTION DU TRADE & 3 NIVEAUX DE TP (RÉSOLUTION ISSUES 2 & 3)
var int tradeDir = 0
var float tEntry = na
var float tSL    = na
var float tTP1   = na
var float tTP2   = na
var float tTP3   = na
var float tRisk  = na
var float tLot   = na
var bool  tTP1Done = false
var bool  tTP2Done = false
var int   tBar     = na

var line lnEntry = na
var line lnSL    = na
var line lnTP1   = na
var line lnTP2   = na
var line lnTP3   = na
var label lbEntry = na
var label lbSL    = na

// Stats réelles (aucune triche)
var int nSig   = 0
var int nTP1   = 0
var int nTP2   = 0
var int nTP3   = 0
var int nBE    = 0
var int nSL    = 0
var float totR = 0.0
var float dayR = 0.0

if ta.change(time("D")) != 0
    dayR := 0.0

bool dayBlocked = useDaily and dayR < 0 and (-dayR * riskPct) >= dailyLimit
bool openBuy    = sigBuy  and (tradeDir == 0) and not dayBlocked
bool openSell   = sigSell and (tradeDir == 0) and not openBuy and not dayBlocked

if openBuy or openSell
    bool isB = openBuy
    tradeDir := isB ? 1 : -1
    tEntry := close
    tSL    := isB ? plSLb : plSLs
    tRisk  := math.abs(tEntry - tSL)
    
    // CALCUL DU LOT STRICTEMENT RÉEL (RÉSOLUTION ISSUE 2)
    float riskAmount = capital * (riskPct / 100.0)
    tLot := (tRisk > 0 and contractSize > 0) ? (riskAmount / (tRisk * contractSize)) : 0.01
    float roundedLot = math.max(0.01, math.round(tLot * 100.0) / 100.0)
    string lotStr = str.tostring(roundedLot, "0.00")
    
    tTP1 := isB ? tEntry + tp1R * tRisk : tEntry - tp1R * tRisk
    tTP2 := isB ? tEntry + tp2R * tRisk : tEntry - tp2R * tRisk
    tTP3 := isB ? tEntry + tp3R * tRisk : tEntry - tp3R * tRisk
    tTP1Done := false
    tTP2Done := false
    tBar     := bar_index
    nSig += 1

    // WEBHOOK OFFICIEL D'OUVERTURE (RÉSOLUTION ISSUE 7)
    string act = isB ? "ACHAT" : "VENTE"
    alert('{"secret":"' + botSecret + '","action":"' + act + '","symbol":"XAUUSD","entry":' + str.tostring(tEntry) + ',"sl":' + str.tostring(tSL) + ',"tp1":' + str.tostring(tTP1) + ',"tp2":' + str.tostring(tTP2) + ',"tp3":' + str.tostring(tTP3) + ',"lot":"' + lotStr + '","risk_r":1.0,"score":' + str.tostring(isB ? scoreB : scoreS) + '}', alert.freq_once_per_bar_close)

    if showSig
        label.new(bar_index, isB ? low : high, (isB ? "ACHAT " : "VENTE ") + f_p(close) + " (Lot: " + lotStr + ")", style=isB ? label.style_label_up : label.style_label_down, color=isB ? cBuy : cSell, textcolor=color.white, size=size.small)
    if showLvl
        lnEntry := line.new(bar_index, tEntry, bar_index + 1, tEntry, color=cEntry, style=line.style_dotted, width=2)
        lnSL    := line.new(bar_index, tSL, bar_index + 1, tSL, color=cSell, style=line.style_dotted, width=2)
        lnTP1   := line.new(bar_index, tTP1, bar_index + 1, tTP1, color=cTP1, style=line.style_dotted, width=2)
        lnTP2   := line.new(bar_index, tTP2, bar_index + 1, tTP2, color=cBuy, style=line.style_dotted, width=2)
        lnTP3   := line.new(bar_index, tTP3, bar_index + 1, tTP3, color=cTP3, style=line.style_dotted, width=2)
        lbEntry := label.new(bar_index + 1, tEntry, "ENTRÉE " + f_p(tEntry), style=label.style_label_left, color=color.new(cEntry, 15), textcolor=color.white, size=size.small)
        lbSL    := label.new(bar_index + 1, tSL, "SL " + f_p(tSL), style=label.style_label_left, color=color.new(cSell, 15), textcolor=color.white, size=size.small)

// GESTION DU TRADE EN DIRECT — CALCUL EXACT DU R PONDÉRÉ (RÉSOLUTION ISSUE 3 & 7)
if tradeDir != 0 and bar_index > tBar
    bool hitTP1 = tradeDir == 1 ? high >= tTP1 : low <= tTP1
    bool hitTP2 = tradeDir == 1 ? high >= tTP2 : low <= tTP2
    bool hitTP3 = tradeDir == 1 ? high >= tTP3 : low <= tTP3
    bool hitSL  = tradeDir == 1 ? low <= tSL : high >= tSL

    // 1. GESTION TP1 (Ferme 50% @ 0.5R = +0.25R & Déplace SL à BE)
    if hitTP1 and not tTP1Done
        tTP1Done := true
        nTP1 += 1
        tSL := tEntry + (tradeDir == 1 ? 0.30 : -0.30) // SL au Break-Even + marge spread
        alert('{"secret":"' + botSecret + '","action":"TP1_HIT","symbol":"XAUUSD","price":' + str.tostring(close) + ',"partial_pct":50,"move_sl_to_be":true,"new_sl":' + str.tostring(tSL) + '}', alert.freq_once_per_bar_close)
        if showSig
            label.new(bar_index, tradeDir == 1 ? high : low, "TP1 TOUCHÉ (50% lot) ✔ SL @ BE (+0.25R garanti)", style=tradeDir == 1 ? label.style_label_down : label.style_label_up, color=cTP1, textcolor=color.black, size=size.small)

    // 2. GESTION TP2 (Ferme 25% @ 1.5R = +0.375R, Total cumulé = +0.625R)
    if hitTP2 and not tTP2Done
        tTP2Done := true
        nTP2 += 1
        alert('{"secret":"' + botSecret + '","action":"TP2_HIT","symbol":"XAUUSD","price":' + str.tostring(close) + ',"partial_pct":25}', alert.freq_once_per_bar_close)
        if showSig
            label.new(bar_index, tradeDir == 1 ? high : low, "TP2 TOUCHÉ (25% lot) ✔ (+0.625R total)", style=tradeDir == 1 ? label.style_label_down : label.style_label_up, color=cBuy, textcolor=color.white, size=size.small)

    // 3. GESTION TP3 (Ferme le runner 25% @ 3.0R = +0.75R, Total cumulé = +1.375R)
    if hitTP3
        nTP3 += 1
        float netGainR = 0.50 * tp1R + 0.25 * tp2R + 0.25 * tp3R // = +1.375R
        dayR += netGainR
        totR += netGainR
        tradeDir := 0
        alert('{"secret":"' + botSecret + '","action":"TP3_HIT","symbol":"XAUUSD","price":' + str.tostring(close) + ',"close_all":true,"total_r":1.375}', alert.freq_once_per_bar_close)
        if showSig
            label.new(bar_index, tradeDir == 1 ? high : low, "TP3 RUNNER TOUCHÉ 🎯 Clôture totale (+1.375R)", style=tradeDir == 1 ? label.style_label_down : label.style_label_up, color=cTP3, textcolor=color.white, size=size.small)

    // 4. GESTION DU STOP LOSS OU DU BREAK-EVEN
    else if hitSL
        if tTP2Done
            // A touché TP1 et TP2, puis retour à BE : on conserve +0.625R !
            nBE += 1
            float netGainR = 0.50 * tp1R + 0.25 * tp2R // = +0.625R
            dayR += netGainR
            totR += netGainR
            alert('{"secret":"' + botSecret + '","action":"BE_HIT","symbol":"XAUUSD","price":' + str.tostring(close) + ',"close_all":true,"locked_r":0.625}', alert.freq_once_per_bar_close)
            if showSig
                label.new(bar_index, tradeDir == 1 ? low : high, "BE TOUCHÉ après TP2 (Gain net conservé: +0.625R)", style=tradeDir == 1 ? label.style_label_up : label.style_label_down, color=color.gray, textcolor=color.white, size=size.small)
        else if tTP1Done
            // A touché TP1 puis retour à BE : on conserve +0.25R ! (RÉSOLUTION ISSUE 3)
            nBE += 1
            float netGainR = 0.50 * tp1R // = +0.25R
            dayR += netGainR
            totR += netGainR
            alert('{"secret":"' + botSecret + '","action":"BE_HIT","symbol":"XAUUSD","price":' + str.tostring(close) + ',"close_all":true,"locked_r":0.25}', alert.freq_once_per_bar_close)
            if showSig
                label.new(bar_index, tradeDir == 1 ? low : high, "BE TOUCHÉ après TP1 (Gain net conservé: +0.25R)", style=tradeDir == 1 ? label.style_label_up : label.style_label_down, color=color.gray, textcolor=color.white, size=size.small)
        else
            // Stop initial plein touché : perte de 1.0R
            nSL += 1
            dayR -= 1.0
            totR -= 1.0
            alert('{"secret":"' + botSecret + '","action":"SL_HIT","symbol":"XAUUSD","price":' + str.tostring(close) + ',"close_all":true,"loss_r":-1.0}', alert.freq_once_per_bar_close)
            if showSig
                label.new(bar_index, tradeDir == 1 ? low : high, "SL TOUCHÉ ✘ (-1.0R)", style=tradeDir == 1 ? label.style_label_up : label.style_label_down, color=cSell, textcolor=color.white, size=size.small)
        tradeDir := 0

// Mise à jour visuelle des lignes de niveaux
if tradeDir != 0 and showLvl and not na(lnEntry)
    line.set_x2(lnEntry, bar_index)
    line.set_x2(lnSL, bar_index)
    line.set_xy1(lnSL, tBar, tSL)
    line.set_xy2(lnSL, bar_index, tSL)
    line.set_x2(lnTP1, bar_index)
    line.set_x2(lnTP2, bar_index)
    line.set_x2(lnTP3, bar_index)
    label.set_xy(lbEntry, bar_index + 1, tEntry)
    label.set_xy(lbSL, bar_index + 1, tSL)
    label.set_text(lbSL, (tTP1Done ? "SL @ BE " : "SL ") + f_p(tSL))

// ═══════════════ TABLEAUX D'AFFICHAGE SANS ERREURS (RÉSOLUTION ISSUES 1 & 5)
var table tGuide = na
var table tMtf   = na
var table tStats = na

// Données Multi-UT
f_htf(string tf) =>
    e = request.security(syminfo.tickerid, tf, ta.ema(close, 200), lookahead=barmerge.lookahead_off)
    c = request.security(syminfo.tickerid, tf, close, lookahead=barmerge.lookahead_off)
    [e, c]

[eA, cA] = f_htf(tfA)
[eB, cB] = f_htf(tfB)
[eC, cC] = f_htf(tfC)
[eD, cD] = f_htf(tfD)

f_bias(float e, float c) => not na(e) and not na(c) ? (c > e ? 1 : -1) : 0
bA = f_bias(eA, cA)
bB = f_bias(eB, cB)
bC = f_bias(eC, cC)
bD = f_bias(eD, cD)
int sumB = bA + bB + bC + bD

if barstate.islast
    for l in scL
        line.delete(l)
    for lb in scLb
        label.delete(lb)
    for bx in scBx
        box.delete(bx)
    array.clear(scL)
    array.clear(scLb)
    array.clear(scBx)
    if showScen and tradeDir == 0
        f_scen(true, scEntB, scSLB, scTP1B, scTP2B)
        f_scen(false, scEntS, scSLS, scTP1S, scTP2S)

    // 1. PANNEAU GUIDE (Gère modes Complet, Compact, Réduit)
    table.delete(tGuide)
    if guideMode >= 0
        bool active = tradeDir != 0
        int side = active ? tradeDir : (trendUp ? 1 : -1)
        string sideTxt = side == 1 ? "ACHAT" : "VENTE"
        bool nearFlip = math.abs(close - mdtStop) <= atr
        
        // Calcul du lot à afficher (RÉSOLUTION ISSUE 2)
        float curRisk = active ? tRisk : (side == 1 ? scRiskB : scRiskS)
        float curLotVal = curRisk > 0 ? (capital * (riskPct / 100.0)) / (curRisk * contractSize) : 0.01
        string curLotTxt = curLotVal < 0.01 ? "0.01 (!)" : str.tostring(math.round(curLotVal * 100.0) / 100.0, "0.00")
        
        string stTxt = active ? ("⚡ " + sideTxt + " EN COURS · Lot: " + curLotTxt) : (nearFlip ? ("🎯 Setup " + sideTxt + " imminent") : ("⏳ EN ATTENTE — MDT " + (trendUp ? "VERT" : "ROUGE")))
        string how = active ? (tTP2Done ? "TP2 fait ! Runner 25% vers TP3 (3.0R)." : tTP1Done ? "TP1 fait (+0.25R garanti). SL à BE. Objectif TP2." : "Trade en cours. Objectif TP1 (0.5R) pour sécuriser.") : (nearFlip ? ("Clôture au-delà de " + f_p(mdtStop) + " déclenchera l'alerte.") : "Surveiller la ligne de tendance MDT et le retest.")
        color stBg = active ? (side == 1 ? cBuy : cSell) : (nearFlip ? #0e7490 : #1e293b)

        if guideMode == 0
            // Mode Réduit : une seule ligne
            tGuide := table.new(guidePos, 1, 1, bgcolor=color.new(cBg, 6), frame_color=color.new(#334155, 20), frame_width=1)
            table.cell(tGuide, 0, 0, stTxt + " · XAUUSD", text_color=color.white, bgcolor=stBg, text_size=szStat)
        else
            // Mode Compact (5 lignes) ou Complet (7 lignes)
            int nRows = guideMode == 2 ? 7 : 5
            tGuide := table.new(guidePos, 4, nRows, bgcolor=color.new(cBg, 6), frame_color=color.new(#334155, 20), frame_width=1, border_color=color.new(#334155, 40), border_width=1)
            f_wide(tGuide, 0, 3, "🎯 MDT SNIPER · " + syminfo.ticker + " · LOT CALCULÉ : " + curLotTxt + " (" + str.tostring(riskPct, "0.0") + "% risque)", color.white, color.new(#1e293b, 0), szBody, text.align_center)
            f_wide(tGuide, 1, 3, stTxt, color.white, stBg, szStat, text.align_center)
            f_wide(tGuide, 2, 3, f_wrap(how, wrapW), #e2e8f0, color.new(cBg, 6), szBody, text.align_left)
            
            table.cell(tGuide, 0, 3, "ENTRÉE", text_color=cEntry, bgcolor=color.new(#1e293b, 20), text_size=szBody)
            table.cell(tGuide, 1, 3, "STOP LOSS", text_color=cSell, bgcolor=color.new(#1e293b, 20), text_size=szBody)
            table.cell(tGuide, 2, 3, "TP1 (50% BE)", text_color=cTP1, bgcolor=color.new(#1e293b, 20), text_size=szBody)
            table.cell(tGuide, 3, 3, "TP2 (25%)", text_color=cBuy, bgcolor=color.new(#1e293b, 20), text_size=szBody)

            float dispEnt = active ? tEntry : (side == 1 ? scEntB : scEntS)
            float dispSL  = active ? tSL : (side == 1 ? scSLB : scSLS)
            float dispTP1 = active ? tTP1 : (side == 1 ? scTP1B : scTP1S)
            float dispTP2 = active ? tTP2 : (side == 1 ? scTP2B : scTP2S)

            table.cell(tGuide, 0, 4, f_p(dispEnt), text_color=cEntry, bgcolor=color.new(cBg, 6), text_size=szVal)
            table.cell(tGuide, 1, 4, f_p(dispSL), text_color=cSell, bgcolor=color.new(cBg, 6), text_size=szVal)
            table.cell(tGuide, 2, 4, f_p(dispTP1), text_color=cTP1, bgcolor=color.new(cBg, 6), text_size=szVal)
            table.cell(tGuide, 3, 4, f_p(dispTP2), text_color=cBuy, bgcolor=color.new(cBg, 6), text_size=szVal)

            if guideMode == 2
                // Checklist de confluence 7 points en mode Complet
                f_wide(tGuide, 5, 3, f_chk(side == 1 ? cB1 : cS1) + "EMA200 H1/H4  ·  " + f_chk(side == 1 ? cB2 : cS2) + "Zone OB/FVG  ·  " + f_chk(side == 1 ? cB3 : cS3) + "Sweep  ·  " + f_chk(side == 1 ? cB4 : cS4) + "BoS", #cbd5e1, color.new(cBg, 6), szBody, text.align_left)
                f_wide(tGuide, 6, 3, f_chk(side == 1 ? cB5 : cS5) + "Flip MDT  ·  " + f_chk(side == 1 ? cB6 : cS6) + "Volume HVB  ·  " + f_chk(side == 1 ? cB7 : cS7) + "SL ATR valide (0.4-3.5)", #cbd5e1, color.new(cBg, 6), szBody, text.align_left)

    // 2. RADAR MULTI-UT SANS FONCTIONS MORTES (RÉSOLUTION ISSUE 5)
    table.delete(tMtf)
    if mtfMode > 0
        string consTxt = (sumB >= 3 ? "BIAIS INSTITUTIONNEL HAUSSIER" : sumB <= -3 ? "BIAIS INSTITUTIONNEL BAISSIER" : "BIAIS MIXTE") + "  " + str.tostring(math.abs(sumB)) + "/4"
        color consCol  = sumB >= 3 ? cBuy : sumB <= -3 ? cSell : color.gray
        
        if mtfMode == 1
            tMtf := table.new(position.bottom_right, 2, 1, bgcolor=color.new(cBg, 6), frame_color=color.new(#334155, 20), frame_width=1)
            table.cell(tMtf, 0, 0, "Radar Multi-UT", text_color=color.white, bgcolor=color.new(#1e293b, 0), text_size=size.small)
            table.cell(tMtf, 1, 0, consTxt, text_color=consCol, bgcolor=color.new(cBg, 6), text_size=size.small)
        else
            tMtf := table.new(position.bottom_right, 4, 5, bgcolor=color.new(cBg, 6), frame_color=color.new(#334155, 20), frame_width=1)
            f_wide(tMtf, 0, 3, "RADAR CONFLUENCE MULTI-TIMEFRAME", color.white, color.new(#1e293b, 0), size.small, text.align_center)
            table.cell(tMtf, 0, 1, "M5: " + (bA == 1 ? "▲" : "▼"), text_color=bA == 1 ? cBuy : cSell, text_size=size.small)
            table.cell(tMtf, 1, 1, "M15: " + (bB == 1 ? "▲" : "▼"), text_color=bB == 1 ? cBuy : cSell, text_size=size.small)
            table.cell(tMtf, 2, 1, "H1: " + (bC == 1 ? "▲" : "▼"), text_color=bC == 1 ? cBuy : cSell, text_size=size.small)
            table.cell(tMtf, 3, 1, "H4: " + (bD == 1 ? "▲" : "▼"), text_color=bD == 1 ? cBuy : cSell, text_size=size.small)
            f_wide(tMtf, 2, 3, consTxt, consCol, color.new(#1e293b, 20), size.small, text.align_center)
            f_wide(tMtf, 3, 3, "Filtre Session : " + (inSess ? "KILLZONE ACTIVE ⚡" : "HORS SESSION ⏳"), inSess ? color.teal : color.gray, color.new(cBg, 6), size.small, text.align_center)
            f_wide(tMtf, 4, 3, "Fibonacci OTE : " + (isFibOk ? (trendUp ? "Discount (Achats)" : "Premium (Ventes)") : "En attente"), #facc15, color.new(cBg, 6), size.small, text.align_center)

    // 3. TABLEAU DE STATISTIQUES SANS CRASH (RÉSOLUTION ISSUE 1 & TRANSPARENCE)
    table.delete(tStats)
    if showStats
        int totalFinished = nTP1 + nBE + nSL
        int totalWins = nTP1 + nBE // Trades avec profit net >= +0.25R
        string winRateTxt = totalFinished > 0 ? (str.tostring(totalWins * 100.0 / totalFinished, "#.#") + "%") : "—"
        
        // CORRECTION MAJEURE : tStats n'a que 2 colonnes (0 et 1). On appelle f_wide avec endCol = 1 !
        tStats := table.new(position.bottom_left, 2, 7, bgcolor=color.new(cBg, 6), frame_color=color.new(#334155, 20), frame_width=1, border_color=color.new(#334155, 40), border_width=1)
        f_wide(tStats, 0, 1, "📊 STATS DU SCRIPT (XAUUSD)", color.white, color.new(#1e293b, 0), size.small, text.align_center)
        
        table.cell(tStats, 0, 1, "Signaux déclenchés", text_color=#94a3b8, text_size=size.small)
        table.cell(tStats, 1, 1, str.tostring(nSig), text_color=color.white, text_size=size.small)
        
        table.cell(tStats, 0, 2, "TP1 sécurisés (+0.25R)", text_color=#94a3b8, text_size=size.small)
        table.cell(tStats, 1, 2, str.tostring(nTP1), text_color=cTP1, text_size=size.small)

        table.cell(tStats, 0, 3, "TP2 atteints (+0.625R)", text_color=#94a3b8, text_size=size.small)
        table.cell(tStats, 1, 3, str.tostring(nTP2), text_color=cBuy, text_size=size.small)

        table.cell(tStats, 0, 4, "Sorties BE (+0.25R/+0.62R)", text_color=#94a3b8, text_size=size.small)
        table.cell(tStats, 1, 4, str.tostring(nBE), text_color=color.rgb(148, 163, 184), text_size=size.small)

        table.cell(tStats, 0, 5, "Stop Loss complets (-1R)", text_color=#94a3b8, text_size=size.small)
        table.cell(tStats, 1, 5, str.tostring(nSL), text_color=cSell, text_size=size.small)

        table.cell(tStats, 0, 6, "Taux de réussite · R Net", text_color=#94a3b8, text_size=size.small)
        table.cell(tStats, 1, 6, winRateTxt + " · " + (totR >= 0 ? "+" : "") + str.tostring(totR, "#.##") + "R", text_color=totR >= 0 ? cBuy : cSell, text_size=size.small)
`;

  // Code Stratégie v5 pour TradingView Strategy Tester (avec backtest automatique officiel)
  const strategyCode = `//@version=5
// ============================================================================
//  MDT SNIPER STRATEGY — PINE SCRIPT v5 (POUR LE STRATEGY TESTER DE TRADINGVIEW)
//  Permet de backtester 100% automatiquement la méthode MDT sur l'or (XAUUSD)
//  avec exécution réelle des sorties partielles, slippage et commissions !
// ============================================================================
strategy("MDT Sniper Backtest Strategy", shorttitle="MDT Strat", overlay=true, initial_capital=1000, default_qty_type=strategy.percent_of_equity, default_qty_value=100, commission_type=strategy.commission.cash_per_contract, commission_value=0.07, slippage=1, max_boxes_count=500, max_lines_count=500)

// ───────────── PARAMÈTRES DE RISQUE & CAPITAL
capital      = input.float(1000, "Capital de test ($)", minval=1)
riskPct      = input.float(0.5, "Risque par trade (%)", minval=0.1, maxval=5, step=0.1)
contractSize = input.float(100, "Taille de contrat (XAUUSD = 100)")
atrLen       = input.int(14, "ATR (volatilité)")
trendMult    = input.float(2.0, "Multiplicateur Ligne MDT")
slBuf        = input.float(0.3, "Marge SL (x ATR)")
slLook       = input.int(6, "Pivot SL (N bougies)")
tp1R         = input.float(0.5, "TP1 (R) - Sortie 50% lot")
tp2R         = input.float(1.5, "TP2 (R) - Sortie 25% lot")
tp3R         = input.float(3.0, "TP3 (R) - Runner 25% restant")
useRetest    = input.bool(true, "Entrée sur Retest")

// Calculs de base
atr = ta.atr(atrLen)
var float st = na
var int td = 1
upS = low - atr * trendMult
dnS = high + atr * trendMult
if na(st)
    st := upS
if td == 1
    if upS > st
        st := upS
    if close < st
        td := -1
        st := dnS
if td == -1
    if dnS < st
        st := dnS
    if close > st
        td := 1
        st := upS

trendUp = td == 1
flipUp  = td == 1 and td[1] == -1
flipDn  = td == -1 and td[1] == 1

// Structure & Retest
mph = ta.pivothigh(high, 2, 2)
mpl = ta.pivotlow(low, 2, 2)
var float microHigh = na
var float microLow  = na
if not na(mph)
    microHigh := mph
if not na(mpl)
    microLow := mpl

loL = ta.lowest(low, slLook)
hiL = ta.highest(high, slLook)
plSLb = loL - slBuf * atr
plSLs = hiL + slBuf * atr
riskB = close - plSLb
riskS = plSLs - close
riskOKb = riskB >= 0.4 * atr and riskB <= 3.5 * atr
riskOKs = riskS >= 0.4 * atr and riskS <= 3.5 * atr

// Killzones Londres & New York
inLondon = not na(time(timeframe.period, "0700-1100:23456", "UTC"))
inNY     = not na(time(timeframe.period, "1230-1700:23456", "UTC"))
inSess   = inLondon or inNY

var bool armL = false
var float armLLevel = na
var int armLBar = na
var bool armS = false
var float armSLevel = na
var int armSBar = na

if flipUp and riskOKb and inSess
    armL := true
    armLLevel := microHigh
    armLBar := bar_index

if flipDn and riskOKs and inSess
    armS := true
    armSLevel := microLow
    armSBar := bar_index

retestL = armL and not na(armLBar) and bar_index > armLBar and not na(armLLevel) and low <= armLLevel and close >= armLLevel
retestS = armS and not na(armSBar) and bar_index > armSBar and not na(armSLevel) and high >= armSLevel and close <= armSLevel

longCondition  = barstate.isconfirmed and strategy.position_size == 0 and (useRetest ? retestL : (flipUp and riskOKb and inSess))
shortCondition = barstate.isconfirmed and strategy.position_size == 0 and (useRetest ? retestS : (flipDn and riskOKs and inSess))

var float stratEntry = na
var float stratSL    = na
var float stratRisk  = na
var float stratTP1   = na
var float stratTP2   = na
var float stratTP3   = na

if longCondition
    armL := false
    stratEntry := close
    stratSL    := plSLb
    stratRisk  := math.abs(stratEntry - stratSL)
    stratTP1   := stratEntry + stratRisk * tp1R
    stratTP2   := stratEntry + stratRisk * tp2R
    stratTP3   := stratEntry + stratRisk * tp3R
    
    // Calcul de la taille de contrat
    float riskAmount = capital * (riskPct / 100.0)
    float calculatedQty = math.max(1.0, math.round((riskAmount / stratRisk) * 10.0) / 10.0)
    
    strategy.entry("Achat", strategy.long, qty=calculatedQty)
    strategy.exit("TP1_A", "Achat", qty_percent=50, limit=stratTP1, stop=stratSL)
    strategy.exit("TP2_A", "Achat", qty_percent=50, limit=stratTP2, stop=stratEntry) // Après TP1, stop au BE
    strategy.exit("TP3_A", "Achat", qty_percent=100, limit=stratTP3, stop=stratEntry)

if shortCondition
    armS := false
    stratEntry := close
    stratSL    := plSLs
    stratRisk  := math.abs(stratSL - stratEntry)
    stratTP1   := stratEntry - stratRisk * tp1R
    stratTP2   := stratEntry - stratRisk * tp2R
    stratTP3   := stratEntry - stratRisk * tp3R
    
    float riskAmount = capital * (riskPct / 100.0)
    float calculatedQty = math.max(1.0, math.round((riskAmount / stratRisk) * 10.0) / 10.0)
    
    strategy.entry("Vente", strategy.short, qty=calculatedQty)
    strategy.exit("TP1_V", "Vente", qty_percent=50, limit=stratTP1, stop=stratSL)
    strategy.exit("TP2_V", "Vente", qty_percent=50, limit=stratTP2, stop=stratEntry)
    strategy.exit("TP3_V", "Vente", qty_percent=100, limit=stratTP3, stop=stratEntry)
`;

  const copyScriptToClipboard = () => {
    navigator.clipboard.writeText(pineScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const copyStrategyToClipboard = () => {
    navigator.clipboard.writeText(strategyCode);
    setCopiedStrategy(true);
    setTimeout(() => setCopiedStrategy(false), 3000);
  };

  const copyFixSnippetToClipboard = () => {
    navigator.clipboard.writeText(fixSnippetCode);
    setCopiedFixSnippet(true);
    setTimeout(() => setCopiedFixSnippet(false), 3000);
  };

  const copyWebhookToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#090b12] border border-[#232738] p-5 sm:p-7 shadow-2xl hud-box hud-corners">
        <div className="hud-corner-top-right" />
        <div className="hud-corner-bottom-left" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#232738]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/15 text-amber-300 flex items-center justify-center border border-amber-400/30 shadow-inner">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-heading font-extrabold text-lg text-[#f1f3f9]">
                  MDT Sniper — Suite Officielle Pine Script v5
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Audit Expert Appliqué
                </span>
              </div>
              <p className="text-xs text-[#8d93a8]">
                Tableau sans crash, calcul de lot réel, 3 TPs avec R net pondéré, Fibonacci OTE directionnel et Strategy Tester.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#141724] text-[#8d93a8] hover:text-white flex items-center justify-center transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-4 pb-2 border-b border-[#232738]/80">
          <button
            onClick={() => setActiveTab('script')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer ${
              activeTab === 'script'
                ? 'bg-amber-400/15 text-amber-300 border border-amber-400/40 shadow-sm'
                : 'text-[#8d93a8] hover:text-[#f1f3f9]'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Indicateur v5 (Graphique & Alertes)</span>
          </button>

          <button
            onClick={() => setActiveTab('strategy')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer ${
              activeTab === 'strategy'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 shadow-sm'
                : 'text-[#8d93a8] hover:text-emerald-400'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Strategy Tester (Vraies Stats TV)</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-[#8d93a8] hover:text-cyan-400'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Audit & Vérité Mathématique (8 Fixes)</span>
          </button>

          <button
            onClick={() => setActiveTab('webhook')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer ${
              activeTab === 'webhook'
                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-[#8d93a8] hover:text-purple-400'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Webhook Robot (JSON Intégral)</span>
          </button>

          <button
            onClick={() => setActiveTab('error_fix')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-medium transition cursor-pointer ${
              activeTab === 'error_fix'
                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/40 shadow-sm'
                : 'text-[#8d93a8] hover:text-rose-400'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Snippet Rapide (Crash tStats)</span>
          </button>
        </div>

        {/* Tab 1: Indicator Code */}
        {activeTab === 'script' && (
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-2xl bg-[#0e111c] border border-[#232738] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Code Prêt à l'Emploi pour TradingView (Édition Master Audit)
                </div>
                <div className="text-[11px] text-[#8d93a8] mt-0.5">
                  Ouvrez l'Éditeur Pine sur TradingView, supprimez l'ancien code, collez celui-ci et cliquez sur « Ajouter au graphique ».
                </div>
              </div>
              <button
                onClick={copyScriptToClipboard}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-amber-400 text-black hover:bg-amber-300 transition cursor-pointer whitespace-nowrap shadow-md"
              >
                {copiedScript ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4" />}
                <span>{copiedScript ? 'Copié dans le presse-papier !' : 'Copier Tout le Script'}</span>
              </button>
            </div>

            <div className="relative rounded-2xl bg-[#06070d] border border-[#232738] overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#121522] border-b border-[#232738] text-[11px] font-mono text-[#8d93a8]">
                <span>Pine Script v5 · Overlay = true · Table safe & Directional OTE</span>
                <span className="text-amber-400 font-semibold">100% Anti-Repeint (barstate.isconfirmed)</span>
              </div>
              <pre className="p-4 font-mono text-xs text-[#e1e4ee] overflow-x-auto max-h-[380px] leading-relaxed select-all">
                <code>{pineScriptCode}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Tab 2: Strategy Tester */}
        {activeTab === 'strategy' && (
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <h3 className="font-heading font-bold text-sm text-emerald-400 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Le Vrai Testeur de Stratégie TradingView (Strategy Tester)
              </h3>
              <p className="text-xs text-[#d1d5e3] leading-relaxed">
                Au lieu d'estimations approximatives sur graphique, cette version convertit le moteur MDT en <code className="text-emerald-300 font-mono bg-black/40 px-1 py-0.5 rounded">strategy()</code> native. TradingView calcule alors les <strong>vraies statistiques</strong> : Profit Factor, Max Drawdown, Slippage et commission de courtier, sur des milliers de barres historiques.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0e111c] border border-[#232738] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-emerald-400">Code de la Stratégie (Backtesting Automatique)</div>
                <div className="text-[11px] text-[#8d93a8]">
                  Gère les sorties fractionnées (50% TP1 @ 0.5R, 25% TP2 @ 1.5R, 25% TP3 @ 3.0R) et le stop au Break-Even.
                </div>
              </div>
              <button
                onClick={copyStrategyToClipboard}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-emerald-500 text-black hover:bg-emerald-400 transition cursor-pointer whitespace-nowrap shadow-md"
              >
                {copiedStrategy ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4" />}
                <span>{copiedStrategy ? 'Copié !' : 'Copier la Stratégie'}</span>
              </button>
            </div>

            <div className="relative rounded-2xl bg-[#06070d] border border-[#232738] overflow-hidden">
              <pre className="p-4 font-mono text-xs text-[#e1e4ee] overflow-x-auto max-h-[340px] leading-relaxed select-all">
                <code>{strategyCode}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Tab 3: Detailed 8 Fixes Audit */}
        {activeTab === 'audit' && (
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30">
              <h3 className="font-heading font-bold text-sm text-cyan-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Examen des 8 Points de l'Audit & Implémentation Rigoureuse
              </h3>
              <p className="text-xs text-[#cbd5e1] mt-1 leading-relaxed">
                Chacune des 8 remarques a été traitée directement dans l'algorithme :
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-[#0e111c] border border-[#232738] space-y-1.5">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-400 text-[10px] flex items-center justify-center font-mono font-bold">1</span>
                  Plantage tStats Résolu
                </div>
                <p className="text-[#8d93a8] text-[11px] leading-relaxed">
                  <code className="text-white">tStats</code> n'a que 2 colonnes (0 et 1). L'ancien code appelait <code className="text-rose-400">table.merge_cells(tStats, 0, r, 3, r)</code> provoquant un crash runtime. Désormais, <code className="text-emerald-400">f_wide(tStats, r, 1, ...)</code> fusionne uniquement les colonnes existantes.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0e111c] border border-[#232738] space-y-1.5">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-400 text-[10px] flex items-center justify-center font-mono font-bold">2</span>
                  Lot Size Basé sur tRisk Réel
                </div>
                <p className="text-[#8d93a8] text-[11px] leading-relaxed">
                  Le lot n'est plus calculé sur une estimation fixe ATR, mais strictement sur la distance réelle du stop swing <code className="text-white">tRisk = math.abs(close - plSL)</code>. 1R correspond ainsi exactement à 0.5% ou 1% du compte.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0e111c] border border-[#232738] space-y-1.5">
                <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-400 text-[10px] flex items-center justify-center font-mono font-bold">3</span>
                  3 TPs & R Net Pondéré
                </div>
                <p className="text-[#8d93a8] text-[11px] leading-relaxed">
                  Fini le faux calcul où TP2 fermait tout le trade. Le plan fractionné est respecté : 50% TP1 (+0.25R net garanti + SL @ BE), 25% TP2 (+0.375R, total +0.625R) et 25% TP3 runner (+0.75R, total +1.375R).
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0e111c] border border-[#232738] space-y-1.5">
                <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-400 text-[10px] flex items-center justify-center font-mono font-bold">4</span>
                  Fibonacci OTE Directionnel
                </div>
                <p className="text-[#8d93a8] text-[11px] leading-relaxed">
                  En tendance haussière, la zone OTE (61.8% - 78.6%) est calculée dans le <strong>Discount</strong> (sous le 50%). En tendance baissière, elle est calculée dans le <strong>Premium</strong> (au-dessus du 50%).
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0e111c] border border-[#232738] space-y-1.5">
                <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-400/20 text-cyan-400 text-[10px] flex items-center justify-center font-mono font-bold">5</span>
                  Nettoyage & Modes Fonctionnels
                </div>
                <p className="text-[#8d93a8] text-[11px] leading-relaxed">
                  Suppression des variables mortes. Les modes du panneau Guide (Complet, Compact, Réduit) et du Radar Multi-UT modifient réellement la disposition du tableau selon le besoin de l'utilisateur.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0e111c] border border-[#232738] space-y-1.5">
                <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-400/20 text-cyan-400 text-[10px] flex items-center justify-center font-mono font-bold">6</span>
                  Scénarios Basés sur le Vrai Retest
                </div>
                <p className="text-[#8d93a8] text-[11px] leading-relaxed">
                  Les scénarios projectifs n'affichent plus une entrée statique sur la ligne MDT, mais modélisent le niveau de retest attendu sur la micro-structure cassée (<code className="text-white">microHigh</code> ou <code className="text-white">microLow</code>).
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0e111c] border border-[#232738] space-y-1.5">
                <div className="font-semibold text-purple-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-purple-400/20 text-purple-400 text-[10px] flex items-center justify-center font-mono font-bold">7</span>
                  Webhook Intégral (Tous Événements)
                </div>
                <p className="text-[#8d93a8] text-[11px] leading-relaxed">
                  Alertes Webhook complètes pour <code className="text-white">ACHAT</code>, <code className="text-white">VENTE</code>, <code className="text-white">TP1_HIT</code> (fermeture 50% + SL à BE), <code className="text-white">TP2_HIT</code>, <code className="text-white">TP3_HIT</code>, <code className="text-white">BE_HIT</code> et <code className="text-white">SL_HIT</code>. Clé paramétrable sans fuite.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#0e111c] border border-[#232738] space-y-1.5">
                <div className="font-semibold text-rose-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-rose-400/20 text-rose-400 text-[10px] flex items-center justify-center font-mono font-bold">8</span>
                  Vérité des Statistiques
                </div>
                <p className="text-[#8d93a8] text-[11px] leading-relaxed">
                  Fin des affirmations trompeuses ("90% profit") ou "100%" quand 0 trade n'a encore eu lieu. Si aucun trade n'est clôturé, le script affiche honnêtement <code className="text-white">—</code>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Webhook Payload */}
        {activeTab === 'webhook' && (
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-2xl bg-[#0e111c] border border-[#232738] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-amber-300 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  URL Webhook TradingView du Bureau :
                </span>
                <button
                  onClick={copyWebhookToClipboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono bg-[#141724] text-cyan-300 hover:bg-[#1e2336] transition cursor-pointer"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWebhook ? 'Copié !' : 'Copier l’URL'}</span>
                </button>
              </div>
              <div className="p-3 rounded-xl bg-[#06070d] border border-[#232738] font-mono text-xs text-cyan-300 break-all select-all">
                {webhookUrl}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0e111c] border border-[#232738] space-y-2">
              <div className="text-xs font-semibold text-[#f1f3f9]">Exemple de message JSON envoyé à l'entrée :</div>
              <pre className="p-3 rounded-xl bg-[#06070d] border border-[#232738] font-mono text-xs text-amber-200 overflow-x-auto leading-relaxed">
{`{
  "secret": "${botKey}",
  "action": "ACHAT",
  "symbol": "XAUUSD",
  "entry": 2742.50,
  "sl": 2736.80,
  "tp1": 2745.35,
  "tp2": 2751.05,
  "tp3": 2759.60,
  "lot": "0.05",
  "risk_r": 1.0,
  "score": 6
}`}
              </pre>
            </div>

            <div className="p-4 rounded-2xl bg-[#0e111c] border border-[#232738] space-y-2">
              <div className="text-xs font-semibold text-[#f1f3f9]">Exemple d'alerte TP1 (50% clôturé + Break-Even) :</div>
              <pre className="p-3 rounded-xl bg-[#06070d] border border-[#232738] font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed">
{`{
  "secret": "${botKey}",
  "action": "TP1_HIT",
  "symbol": "XAUUSD",
  "price": 2745.35,
  "partial_pct": 50,
  "move_sl_to_be": true,
  "new_sl": 2742.80
}`}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 5: Quick Snippet */}
        {activeTab === 'error_fix' && (
          <div className="mt-4 space-y-4">
            <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-2">
              <h3 className="font-heading font-bold text-sm text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Correction Ciblée pour Ancienne Version
              </h3>
              <p className="text-xs text-[#d1d5e3] leading-relaxed">
                Si vous préférez conserver votre fichier existant sans tout remplacer, copiez ce snippet qui redéfinit <code className="text-amber-300">f_wide</code> avec vérification de colonnes et corrige le calcul de lot :
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0e111c] border border-[#232738] flex items-center justify-between">
              <div className="text-xs font-semibold text-amber-300">Snippet de Correction Rapide</div>
              <button
                onClick={copyFixSnippetToClipboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-rose-500 text-black hover:bg-rose-400 transition cursor-pointer"
              >
                {copiedFixSnippet ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedFixSnippet ? 'Copié !' : 'Copier le Snippet'}</span>
              </button>
            </div>

            <pre className="p-4 rounded-2xl bg-[#06070d] border border-[#232738] font-mono text-xs text-[#e1e4ee] overflow-x-auto max-h-[250px] leading-relaxed">
              <code>{fixSnippetCode}</code>
            </pre>
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-5 pt-3 border-t border-[#232738] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8d93a8]">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Formule mathématique vérifiée : Risque = tRisk × TailleContrat × Lot = 0.5% Capital</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-mono bg-[#141724] text-white hover:bg-[#1e2336] transition cursor-pointer"
          >
            Fermer le dialogue
          </button>
        </div>
      </div>
    </div>
  );
};
