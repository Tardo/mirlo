Mirlo uses 'Web Components' and they use the tag 'template'. More info here:
https://developer.mozilla.org/en-US/docs/Web/API/Web_Components/Using_templates_and_slots

The most important thing when creating templates is to be clear about the scope of the nodes. The template has its own
scope and parent styles do not affect it... that's why there is the `useStyles()` hook function (you can also use the
`link' tag directly in the template).

The slots, on the other hand, do not belong to the scope of the template. So you will have to inject the style for these
nodes in the appropriate document.
