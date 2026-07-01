import"./modulepreload-polyfill-B5Qt9EMX.js";const i=[{id:"flow-field",title:"Flow Field",description:"Mouse-reactive aurora noise field. Move to warp, click to pulse.",path:"/animation-exploration/animations/flow-field/",tags:["shader","interactive"]},{id:"wave-horizon",title:"Wave Horizon",description:"3D opposing waves crash together — warm from the left, cool from the right, blending where they meet.",path:"/animation-exploration/animations/wave-horizon/",tags:["3d","shader","interactive"]}],t=document.getElementById("grid");t.innerHTML=i.map(e=>`
    <a class="card" href="${e.path}">
      <div class="card-header">
        <h2>${e.title}</h2>
        <span class="card-arrow" aria-hidden="true">→</span>
      </div>
      <p>${e.description}</p>
      <div class="tags">
        ${e.tags.map(a=>`<span class="tag">${a}</span>`).join("")}
      </div>
    </a>
  `).join("");
