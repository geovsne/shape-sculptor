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

- Atlas and simulator share the muscle surface material in `muscleMaterial.ts`; keep fibre shading in one place to prevent visual drift.
- Atlas muscle detail is derived from each anatomical part without replacing its mesh, so selection and all anatomical layers stay aligned.
