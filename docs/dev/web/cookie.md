# Cookie不同子域名共享

## 使用场景

集成统一认证或其它情况时，需要在`b.test.com`域名网站中获取`a.test.com`域名网站保存的cookie信息

## 解决方法

在`a.test.com`域名网站中设置cookie值时，设置`Domain`值为根域名`.test.com`，即可在所有的`*.test.com`网站中共享cookie值。