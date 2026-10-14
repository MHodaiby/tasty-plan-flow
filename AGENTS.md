<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep subscription-day validation and derived request counts in `src/lib/subscription-rules.ts`, mirrored by database triggers; client validation alone cannot secure API writes.
- Grandfather incompatible subscription records only while their original days remain unchanged, visibly flag them for review, and block activation and new meal selections until corrected; history must remain intact.
