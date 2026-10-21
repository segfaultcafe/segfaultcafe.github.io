---
layout: page
title: Arquivo
lang: pt-BR
permalink: /pt-br/archive
---

<section>
  {% assign posts = site.pt_br_posts | sort: "date" | reverse %}
  {% assign current_year = "" %}
  {% for post in posts %}
    {% assign post_year = post.date | date: "%Y" %}
    {% if post_year != current_year %}
      {% unless current_year == "" %}</ul>{% endunless %}
      <h3>{{ post_year }}</h3>
      <ul>
      {% assign current_year = post_year %}
    {% endif %}
    <li><time>{{ post.date | date: "%d/%m" }} - </time><a href="{{ post.url | prepend: site.baseurl | replace: '//', '/' }}">{{ post.title }}</a></li>
  {% endfor %}
  {% unless posts == empty %}</ul>{% endunless %}
</section>
