Mootilities
===========

Mootools + Utilities = Mootilities

It's that easy!

Classes/Snippets/Plugins:

XSR.js
 - A script to make cross site requests (XSR) using the script-injection technique used in JSONP calls
 - Includes the following classes
   - XSR (base class, easy extendable to evaluate other formats)
   - XSR.JSONP (evaluates the response as a json object)
   - XSR.HTMLP (evaluates the response as HTML (using the same processHTML-method as Request.HTML)
   - XSR.XMLP (evaluates the response as XML, using the browsers build-in XML-parsers)