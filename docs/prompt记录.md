#   Step1 生成epub基础库

你好, 我想编写一个基于node输出epub3.3格式文件的项目, 能够将指定html,以及对应的img文件添加进最终文件中,请帮我设计api并实现

#   Step2  尝试生成epub文件

你好，目前已经完成epub库的校验，请把他移动至项目的library目录中。

然后基于文件`docs\原理.md`中介绍的原理，将[这个](https://mp.weixin.qq.com/mp/appmsgalbum?__biz=Mzg2MzcyODQ5MQ==&action=getalbum&album_id=3845871143212695552&subscene=21&scenenote=https://mp.weixin.qq.com/s%253F__biz=Mzg2MzcyODQ5MQ==&mid=2247492968&idx=1&sn=038c14a5aa0176688ea59fc70200e528&scene=21&subscene=10000&sessionid=1751742350&clicktime=1751742417&enterid=1751742417&ascene=56&fasttmpl_type=0&fasttmpl_fullversion=7805417-zh_CN-zip&fasttmpl_flag=0&realreporttime=1751742417256&devicetype=android-35&version=28003d34&nettype=WIFI&abtest_cookie=AAACAA==&lang=zh_CN&countrycode=CN&exportkey=n_ChQIAhIQBz+57KV+3jGgWc7F6F5MzBLbAQIE97dBBAEAAAAAAOJQNwpmY60AAAAOpnltbLcz9gKNyK89dVj0VQwm6FwUE3z6HhAHh50BKVI2sTm7H+Jm7UDxZgNoOrvVpbcOxM/EXNT/N0/SNzXEWltUTC24kpr7Gia9PgOTDYGgS7GVEbEDsjXtYe5j7LvffAZj0r9kWCijCUNccfjPKQJm7BstaTMFOV9ogvQR+GOK2VYy/7HZ3nCnUh/W1OLrjE9F+P8G6ov2SyGSMzDkH30YIiLtgNKV83HhfK4GQJqf2v2uhX/4fHvK7c2ZLlJtHWb8IQ==&pass_ticket=xrXM965wzcoonUQR5x4FujV3sv5S1tVrUBepmNXPDpqUtEUUl8m4njyEEYQfgRhN&wx_header=3&nolastread=1#wechat_redirect)链接转换为epub文件


#   step3 分步骤执行

你好，现在需要分开执行过程，请将输出epub的过程分为两步。

第一步：读取[这个](https://mp.weixin.qq.com/mp/appmsgalbum?__biz=Mzg2MzcyODQ5MQ==&action=getalbum&album_id=3845871143212695552&subscene=21&scenenote=https://mp.weixin.qq.com/s%253F__biz=Mzg2MzcyODQ5MQ==&mid=2247492968&idx=1&sn=038c14a5aa0176688ea59fc70200e528&scene=21&subscene=10000&sessionid=1751742350&clicktime=1751742417&enterid=1751742417&ascene=56&fasttmpl_type=0&fasttmpl_fullversion=7805417-zh_CN-zip&fasttmpl_flag=0&realreporttime=1751742417256&devicetype=android-35&version=28003d34&nettype=WIFI&abtest_cookie=AAACAA==&lang=zh_CN&countrycode=CN&exportkey=n_ChQIAhIQBz+57KV+3jGgWc7F6F5MzBLbAQIE97dBBAEAAAAAAOJQNwpmY60AAAAOpnltbLcz9gKNyK89dVj0VQwm6FwUE3z6HhAHh50BKVI2sTm7H+Jm7UDxZgNoOrvVpbcOxM/EXNT/N0/SNzXEWltUTC24kpr7Gia9PgOTDYGgS7GVEbEDsjXtYe5j7LvffAZj0r9kWCijCUNccfjPKQJm7BstaTMFOV9ogvQR+GOK2VYy/7HZ3nCnUh/W1OLrjE9F+P8G6ov2SyGSMzDkH30YIiLtgNKV83HhfK4GQJqf2v2uhX/4fHvK7c2ZLlJtHWb8IQ==&pass_ticket=xrXM965wzcoonUQR5x4FujV3sv5S1tVrUBepmNXPDpqUtEUUl8m4njyEEYQfgRhN&wx_header=3&nolastread=1#wechat_redirect)内对应的内容，在resource文件夹中，创建draft文件夹，以及draft文件夹下创建`电子书名`的子目录，将html，以及html中的js、css、images下载到该目录中，并按页面分为子文件夹进行整理

第二步：在resource/draft/`电子书名`目录中执行node脚本，将html，以及对应的images转换为epub文件
