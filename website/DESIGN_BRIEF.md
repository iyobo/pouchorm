# Documentation site design brief

## User goal

Help a TypeScript developer decide whether PouchORM fits an application, install the correct major version, and complete common collection, query, write, validation, and synchronization tasks without translating marketing language into API behavior.

## Information hierarchy

1. A plain description: typed collections and model helpers for PouchDB.
2. One primary action to start the 5.x guide and a secondary link to GitHub.
3. A short, valid collection example showing the required stable collection name.
4. Three practical capabilities: collection identity, predictable writes, and direct PouchDB access.
5. A visible migration path for applications still using 4.x.
6. Sidebar access to task guides, the API reference, troubleshooting, and security information.

## Versions

- The current documentation describes 5.x and is the default.
- A frozen 4.x snapshot is available from the version selector and marked unmaintained.
- The 4.x pages link to the 5.x migration guide.
- Patch and minor releases do not receive separate documentation snapshots.
- A `next` version is introduced only when work on a new major version begins.

## States and responsive behavior

- Desktop: two-column hero, readable code panel, and a three-column capability grid.
- Tablet and mobile: one-column flow, full-width actions, horizontally scrollable code, and no clipped navigation.
- Light and dark themes: preserve contrast and hierarchy with shared tokens.
- Missing pages and broken links fail the documentation build.
- The version selector remains available on desktop and mobile navigation.

## Copy and feedback

- Use sentence case and describe observable behavior.
- Avoid promotional claims, anthropomorphic phrasing, and shorthand such as “live, retrying, bidirectional synchronization.”
- Put requirements and destructive-operation warnings next to the relevant action.
- Give every error or migration warning a concrete next step.

## Accessibility

- Use logical heading order, descriptive links, and visible keyboard focus.
- Keep interactive targets at least 44 pixels high.
- Do not communicate state through color alone.
- Keep code readable without requiring animation or pointer interaction.
- Respect reduced-motion preferences.

## Visual tokens

- Brand color: clear blue for navigation and primary actions.
- Accent: restrained teal for metadata and supporting details.
- Surfaces: cool white and slate in light mode; softened navy in dark mode.
- Geometry: modest radii, thin borders, and limited shadow.
- Typography: the Docusaurus system stack for prose and its monospace stack for code.

## Deployment and quality gates

- Build on every documentation pull request.
- Deploy from `master` to GitHub Pages using the same branch-based approach as Amala.
- Compile representative examples against the local PouchORM declarations.
- Check the migration-page copy against the packaged migration guide so the two cannot drift.
- Verify representative desktop and mobile layouts before the first deployment.

## Open decisions

- Site search is deferred until the documentation volume or support load justifies an indexing service.
- A custom domain is deferred; the initial site uses the repository's GitHub Pages address.
