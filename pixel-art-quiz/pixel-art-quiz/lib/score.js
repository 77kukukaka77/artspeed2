/* 결과 QR 데이터 만들기/읽기 (학생용·선생님용 공용) */
(function () {
  'use strict';
  const PREFIX = 'ASQ1';
  const SALT = 'sangwon-art-2026';

  function fnv(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  }
  function b64enc(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64dec(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  // rec: {c:반, n:번호, nm:이름, s:점수, k:정답수, b:보너스, q:문항수, t:총반응ms, a:도전회차, d:시각}
  function encode(rec) {
    const body = b64enc(JSON.stringify(rec));
    return PREFIX + '.' + body + '.' + fnv(body + SALT);
  }
  function decode(text) {
    if (!text || typeof text !== 'string') return { ok: false, err: 'QR 내용 없음' };
    const parts = text.trim().split('.');
    if (parts.length !== 3 || parts[0] !== PREFIX) return { ok: false, err: '이 퀴즈의 QR이 아닙니다' };
    if (fnv(parts[1] + SALT) !== parts[2]) return { ok: false, err: '검증 실패 (변조 의심)' };
    try { return { ok: true, rec: JSON.parse(b64dec(parts[1])) }; }
    catch (e) { return { ok: false, err: 'QR 해석 실패' }; }
  }
  window.ScoreCode = { encode, decode };
})();
