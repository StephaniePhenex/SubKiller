# SubKiller - Claude Context

**Core Rules:** Please read `@AGENTS.md` first for global project rules, architecture decisions, and tech stack constraints.

## Claude-Specific Notes

- **UI Prototyping:** You may use Claude Artifacts strictly for ideating isolated React components. 

- **Code Generation:** When modifying the actual Next.js codebase, NEVER output single-file HTML or `htm` tagged templates. Always generate standard `.tsx` and `.ts` files intended for the `src/` directory.

- **Design:** Ensure you parse `@DESIGN.md` for styling before generating any Tailwind classes.