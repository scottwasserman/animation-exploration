import { animations } from './animations.js';

const grid = document.getElementById('grid');

grid.innerHTML = animations
  .map(
    (animation) => `
    <a class="card" href="${animation.path}">
      <div class="card-header">
        <h2>${animation.title}</h2>
        <span class="card-arrow" aria-hidden="true">→</span>
      </div>
      <p>${animation.description}</p>
      <div class="tags">
        ${animation.tags.map((tag) => `<span class="tag">${tag}</span>`).join('')}
      </div>
    </a>
  `,
  )
  .join('');
