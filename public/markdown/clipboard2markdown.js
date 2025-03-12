(function () {
  'use strict';

  // http://pandoc.org/README.html#pandocs-markdown
  
  var pandoc = [
    {
      filter: function(node) {
        return node.nodeName === 'PRE' &&
               node.firstChild &&
               node.firstChild.nodeName === 'CODE';
      },
      replacement: function(content, node) {
        var codeElem = node.firstChild;
        var codeContent = "";
        // If the <code> element contains div elements (like your token-line wrappers)
        if (codeElem.childNodes.length > 0 &&
            codeElem.childNodes[0].nodeName.toLowerCase() === 'div') {
          for (var i = 0; i < codeElem.childNodes.length; i++) {
            var line = codeElem.childNodes[i];
            // Append the text content of each line, plus a newline
            codeContent += line.textContent + "\n";
          }
        } else {
          // Otherwise, fall back to processing child nodes
          for (var i = 0; i < codeElem.childNodes.length; i++) {
            var child = codeElem.childNodes[i];
            if (child.nodeName && child.nodeName.toLowerCase() === 'br') {
              codeContent += "\n";
            } else {
              codeContent += child.textContent;
            }
          }
        }
        return "\n\n```\n" + codeContent + "\n```\n\n";
      }
    },
    {
      filter: 'h1',
      replacement: function (content, node) {
        var underline = Array(content.length + 1).join('=');
        return '\n\n' + content + '\n' + underline + '\n\n';
      }
    },

    {
      filter: 'h2',
      replacement: function (content, node) {
        var underline = Array(content.length + 1).join('-');
        return '\n\n' + content + '\n' + underline + '\n\n';
      }
    },

    {
      filter: 'sup',
      replacement: function (content) {
        return '^' + content + '^';
      }
    },

    {
      filter: 'sub',
      replacement: function (content) {
        return '~' + content + '~';
      }
    },

    {
      filter: 'br',
      replacement: function () {
        return '\\\n';
      }
    },

    {
      filter: 'hr',
      replacement: function () {
        return '\n\n* * * * *\n\n';
      }
    },

    {
      filter: ['em', 'i', 'cite', 'var'],
      replacement: function (content) {
        return '*' + content + '*';
      }
    },

    {
      filter: function (node) {
        var hasSiblings = node.previousSibling || node.nextSibling;
        var isCodeBlock = node.parentNode.nodeName === 'PRE' && !hasSiblings;
        var isCodeElem = node.nodeName === 'CODE' ||
            node.nodeName === 'KBD' ||
            node.nodeName === 'SAMP' ||
            node.nodeName === 'TT';

        return isCodeElem && !isCodeBlock;
      },
      replacement: function (content) {
        return '`' + content + '`';
      }
    },

    {
      filter: function (node) {
        return node.nodeName === 'A' && node.getAttribute('href');
      },
      replacement: function (content, node) {
        var url = node.getAttribute('href');
        var titlePart = node.title ? ' "' + node.title + '"' : '';
        if (content === url) {
          return '<' + url + '>';
        } else if (url === ('mailto:' + content)) {
          return '<' + content + '>';
        } else {
          return '[' + content + '](' + url + titlePart + ')';
        }
      }
    },

    {
      filter: 'li',
      replacement: function (content, node) {
        content = content.replace(/^\s+/, '').replace(/\n/gm, '\n    ');
        var prefix = '-   ';
        var parent = node.parentNode;

        if (/ol/i.test(parent.nodeName)) {
          var index = Array.prototype.indexOf.call(parent.children, node) + 1;
          prefix = index + '. ';
          while (prefix.length < 4) {
            prefix += ' ';
          }
        }

        return prefix + content;
      }
    }
  ];

  // http://pandoc.org/README.html#smart-punctuation
  var escape = function (str) {
    return str.replace(/[\u2018\u2019\u00b4]/g, "'")
              .replace(/[\u201c\u201d\u2033]/g, '"')
              .replace(/[\u2212\u2022\u00b7\u25aa]/g, '-')
              .replace(/[\u2013\u2015]/g, '--')
              .replace(/\u2014/g, '---')
              .replace(/\u2026/g, '...')
              .replace(/[ ]+\n/g, '\n')
              .replace(/\s*\\\n/g, '\\\n')
              .replace(/\s*\\\n\s*\\\n/g, '\n\n')
              .replace(/\s*\\\n\n/g, '\n\n')
              .replace(/\n-\n/g, '\n')
              .replace(/\n\n\s*\\\n/g, '\n\n')
              .replace(/\n\n\n*/g, '\n\n')
              .replace(/[ ]+$/gm, '')
              .replace(/^\s+|[\s\\]+$/g, '');
  };

  var convert = function (str) {
    return escape(toMarkdown(str, { converters: pandoc, gfm: true }));
  }

  var insert = function (myField, myValue) {
      if (document.selection) {
          myField.focus();
          sel = document.selection.createRange();
          sel.text = myValue;
          sel.select()
      } else {
          if (myField.selectionStart || myField.selectionStart == "0") {
              var startPos = myField.selectionStart;
              var endPos = myField.selectionEnd;
              var beforeValue = myField.value.substring(0, startPos);
              var afterValue = myField.value.substring(endPos, myField.value.length);
              myField.value = beforeValue + myValue + afterValue;
              myField.selectionStart = startPos + myValue.length;
              myField.selectionEnd = startPos + myValue.length;
              myField.focus()
          } else {
              myField.value += myValue;
              myField.focus()
          }
      }
  };

  // Expose functions to the global scope for use in React components
  window.convert = convert;
  window.insert = insert;
})();
