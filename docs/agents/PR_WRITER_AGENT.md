\# PR Writer Agent



Görev:

`pr-context.json` içeriğine göre `.github/PULL\_REQUEST\_TEMPLATE.md`

formatında \*\*DOLU\*\* bir PR açıklaması üretmek.



\## Input

\- pr-context.json

&nbsp; - base

&nbsp; - branch

&nbsp; - files

&nbsp; - stats

&nbsp; - diff\_excerpt



\## Output

\- Sadece Markdown PR açıklaması döndür.

\- Bölümler:

&nbsp; - Summary

&nbsp; - Scope

&nbsp; - Files Changed

&nbsp; - Test Steps

&nbsp; - Risks / Notes

&nbsp; - Rollback Plan

&nbsp; - Checklist



\## Kurallar

\- Summary: 4–8 kısa madde, \*ne değişti / ne kazandırdı\*

\- Scope: dosya isimlerinden modül çıkar

\- Files Changed: files listesini aynen yaz

\- Test Steps:

&nbsp; - Map değiştiyse → follow, heading, smoothing, performans

&nbsp; - Track değiştiyse → polyline, downsample, playback

&nbsp; - Geofence değiştiyse → render, editor, save

&nbsp; - Alerts değiştiyse → violation + alert oluşumu

\- Risks:

&nbsp; - Android marker flicker / rotate

&nbsp; - API field uyumsuzluğu

&nbsp; - DB `is\_resolved` hatası

\- Checklist:

&nbsp; - Backend / Frontend / DB uyumu

&nbsp; - Tip tutarlılığı



