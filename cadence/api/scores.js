// Classement Cadence — fonction Vercel (Node) + Upstash Redis (REST).
// Variables d'environnement (ajoutées automatiquement par l'intégration Upstash/KV de Vercel) :
//   KV_REST_API_URL + KV_REST_API_TOKEN   (ou UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)
const crypto = require('crypto');
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOK_ = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function redis(...cmd) {
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + TOK_, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}
const sha = (t) => crypto.createHash('sha256').update('cadence:' + t).digest('hex');
const NAME = /^[\wÀ-ÿ-]{2,16}$/;

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!URL_ || !TOK_) return res.status(500).json({ error: 'Base de données non configurée' });
  try {
    if (req.method === 'GET') {
      const k = String(req.query.k || '');
      if (!/^[0-4]-[0-2]$/.test(k)) return res.status(400).json({ error: 'niveau invalide' });
      const all = (await redis('HGETALL', 'cd:s:' + k)) || [];
      const rows = [];
      for (let i = 1; i < all.length; i += 2) { try { rows.push(JSON.parse(all[i])); } catch {} }
      rows.sort((a, b) => b.p - a.p || b.s - a.s);
      return res.status(200).json(rows.slice(0, 50));
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'méthode non autorisée' });

    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const n = String(b.n || '').trim(), t = String(b.t || '');
    if (!NAME.test(n) || t.length < 6 || t.length > 64) return res.status(400).json({ error: 'données invalides' });
    const uk = 'cd:u:' + n.toLowerCase(), th = sha(t);
    let u = null;
    try { u = JSON.parse(await redis('GET', uk)); } catch {}

    if (b.k === undefined) { // inscription / reconnexion du pseudo
      if (u && u.t !== th) return res.status(409).json({ error: 'pseudo pris' });
      if (!u) await redis('SET', uk, JSON.stringify({ n, t: th, prog: '' }), 'NX');
      return res.status(200).json({ ok: 1, prog: u ? u.prog : '' });
    }

    // envoi d'un score : seulement pour un niveau terminé, par le propriétaire du pseudo
    if (!u || u.t !== th) return res.status(403).json({ error: 'pseudo non enregistré' });
    const k = String(b.k), p = Math.round(+b.p), s = Math.round(+b.s);
    if (!/^[0-4]-[0-2]$/.test(k) || !b.done || !(p >= 0 && p <= 100) || !(s >= 0 && s < 1e9))
      return res.status(400).json({ error: 'score invalide' });
    const sk = 'cd:s:' + k, f = n.toLowerCase();
    let old = null;
    try { old = JSON.parse(await redis('HGET', sk, f)); } catch {}
    if (!old || p > old.p || (p === old.p && s > old.s))
      await redis('HSET', sk, f, JSON.stringify({ n, p, s }));
    if (typeof b.prog === 'string' && b.prog.length < 20000) {
      u.prog = b.prog; await redis('SET', uk, JSON.stringify(u));
    }
    return res.status(200).json({ ok: 1 });
  } catch (e) {
    return res.status(500).json({ error: 'erreur serveur' });
  }
};
