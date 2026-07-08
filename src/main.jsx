import { render } from 'preact';
import './styles/tokens.css';
import './styles/fonts.css';
import './styles/base.css';
import './styles/components.css';
import { App } from './app.jsx';

render(<App />, document.getElementById('app'));
