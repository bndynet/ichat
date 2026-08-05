import './styles.css';
import '@bndynet/ichat';

// Register all renderers globally so chat fences render regardless of which
// page the user is on.  Lazy page imports alone only register the renderer
// after the user navigates to that specific page.
import '@bndynet/ichat-renderers';
import '@bndynet/ichat-renderer-chart';
import '@bndynet/ichat-renderer-katex';
import '@bndynet/ichat-renderer-mermaid';
