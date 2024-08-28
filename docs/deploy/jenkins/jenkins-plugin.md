# Jenkins中搜索不到Publish Over SSH插件

## 问题

使用Docker安装了Jenkin后，需要传输项目打包文件到远程服务器，发现搜索不到Publish Over SSH插件

## 原因

Jenkins官网表明Publish Over SSH插件存在安全问题，给下架了

![image-20220715155608860](https://file.iamwx.cn/images/202207151556911.png)

## 解决

1、下载插件hpi文件：[点击下载](https://mirrors.tuna.tsinghua.edu.cn/jenkins/plugins/publish-over-ssh/latest/publish-over-ssh.hpi)

2、打开jenkins的`系统管理-插件管理-高级-Deploy Plugin`

![image-20220715155905794](https://file.iamwx.cn/images/202207151559823.png)

3、上一步完成后，重启Jenkins即可生效

![image-20220715155942194](https://file.iamwx.cn/images/202207151559229.png)