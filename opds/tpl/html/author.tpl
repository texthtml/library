<!DOCTYPE HTML PUBLIC '-//W3C//DTD HTML 4.01 Transitional//EN'>
<HTML><HEAD>
    <TITLE>{site_title} - {books_by_whom}</TITLE>
    <META NAME="GENERATOR" CONTENT="miniCalOPe">
    <META http-equiv="Content-Type" content="text/html; charset=utf-8">
    <LINK REL="stylesheet" TYPE="text/css" HREF="{relurl}tpl/html/style.css">
    <LINK REL="alternate" TYPE="application/atom+xml;profile=opds-catalog" HREF="{baseurl}?prefix=author_id&amp;query={aid}&amp;offset={offset}&amp;sort_order={sortorder}&amp;lang={lang}&amp;pageformat=opds">
    <LINK REL="search" TYPE="application/opensearchdescription+xml" TITLE="{site_title}" HREF="{baseurl}?lang={lang}&amp;prefix=ods&amp;pageformat=html"/>
    <META NAME="viewport" CONTENT="width=device-width; initial-scale=1.0; minimum-scale=0.5; maximum-scale=2.0; user-scalable=1;" />
</HEAD><BODY>

<H1>{site_title} - {books_by_whom}</H1>

<TABLE ALIGN='center' BORDER='0' CLASS='list'>
    <TR><TD COLSPAN='2'><A HREF='{relurl}?lang={lang}&amp;pageformat=html'><IMG ALT='home' SRC='{relurl}tpl/icons/home.png'> {start_page}</A></TD></TR>
    <TR><TD COLSPAN='2'><A HREF='{relurl}?lang={lang}&amp;pageformat=html&amp;prefix=authors'><IMG ALT='home' SRC='{relurl}tpl/icons/authors.png'> {back_to_authors}</A></TD></TR>
    <TR><TD COLSPAN='2'><A HREF='{relurl}?lang={lang}&amp;pageformat=html&amp;prefix=author_id&amp;sort_order=title&amp;query={aid}'><IMG ALT='home' SRC='{relurl}tpl/icons/alpha.png'> {sort_alpha}</A></TD></TR>
    <TR><TD COLSPAN='2'><A HREF='{relurl}?lang={lang}&amp;pageformat=html&amp;prefix=author_id&amp;sort_order=date&amp;query={aid}'><IMG ALT='home' SRC='{relurl}tpl/icons/date.png'> {sort_date}</A></TD></TR>
    <TR><TD COLSPAN='2'><A HREF='{wikibase}{wikiauthor}' TARGET='_blank'><IMG ALT='home' SRC='{relurl}tpl/icons/world.png'> Wikipedia</A></TD></TR>
<!-- BEGIN itemblock -->
    <TR><TD COLSPAN='2'><A HREF='{relurl}?lang={lang}&amp;pageformat=html&amp;action=bookdetails&amp;book={bid}'><IMG ALT='home' SRC='{relurl}tpl/icons/book.png'> {title}</A></TD></TR>
<!-- END itemblock -->
    <TR><TD COLSPAN='2'>&nbsp;</TD></TR>
    <TR><TD>
<!-- BEGIN prevblock -->
        {link1_open}<IMG ALT='{first_page}' SRC='{rel_url}tpl/icons/{icon1}'>{link_close}
        {link2_open}<IMG ALT='{prev_page}' SRC='{rel_url}tpl/icons/{icon2}'>{link_close}
<!-- END prevblock -->
        </TD><TD ALIGN='right'>
<!-- BEGIN nextblock -->
        {link1_open}<IMG ALT='{next_page}' SRC='{rel_url}tpl/icons/{icon1}'>{link_close}
        {link2_open}<IMG ALT='{last_page}' SRC='{rel_url}tpl/icons/{icon2}'>{link_close}
<!-- END nextblock -->
    </TD></TR>
</TABLE>

<DIV CLASS='updated'>{last_update}: {pubdate_human}</DIV>

<DIV CLASS='appsig'>{created_by} <A HREF='http://projects.izzysoft.de/trac/minicalope'>miniCalOPe</A></DIV>

</BODY></HTML>