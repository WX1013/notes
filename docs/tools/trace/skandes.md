# Idea 集成 skywalking

## 一、Elasticsearch7.10.0 安装

### 1、下载安装包

官网下载地址：https://www.elastic.co/cn/downloads/elasticsearch

![image-20211126105313213](https://file.iamwx.cn/images/202204121750049.png)

![image-20211126105523200](https://file.iamwx.cn/images/202204121750627.png)

选择对应平台即可下载

![image-20211126105603250](https://file.iamwx.cn/images/202204121750369.png)

### 2、解压修改配置

解压压缩包后进入`conf`目录，打开`elasticsearch.yml`文件，设置实例名称：

```properties
# 设置为自定义的名称，后续在Skywalking中设置es的实例对应
cluster.name: seaat-es
```

### 3、运行

进入bin目录，双击运行`elasticsearch.bat`即可运行；mac或linux运行指令

```shell
# 直接运行，ctrl+c 会关闭
./elasticsearch
# 后台运行，linux运行es需要使用子用户，后续补充相关指令...
./elasticsearch -d
```

在浏览器中访问`localhost:9200`出现下图内容，即为启动成功

![image-20211126111259533](https://file.iamwx.cn/images/202204121750607.png)

## 二、Skywalking-es7-8.7.0 安装

### 1、下载安装包

官网下载地址：https://skywalking.apache.org/downloads/

> 这里需要选择兼容es7的版本

选择对应版本的tar包点击进行下载

![image-20211126112702603](https://file.iamwx.cn/images/202204121750606.png)

### 2、解压修改配置

解压压缩包，进入conf文件夹，打开`application.yml`文件，找到`storage`配置项，默认是使用h2数据库，我们这里使用es7，修改为`elasticsearch7`，继续修改`elasticsearch7`的配置为自己的配置：

![image-20211126131925330](https://file.iamwx.cn/images/202204121751496.png)

在webapp目录下有webapp.yml文件，里面配置了Skywalking的访问端口，可根据自己需要进行修改

![image-20211126133104194](https://file.iamwx.cn/images/202204121751497.png)

### 3、运行

windows 进入bin目录下双击执行startup.bat即可。

linux或mac执行以下命令

```shell
sh startup.sh
# 或者先执行
sh oapService.sh
# 再执行
sh webappService.sh
```

启动过程中，es的日志中会有打印

![image-20211126133534662](https://file.iamwx.cn/images/202204121751823.png)

windows启动时开启两个java窗口，es的日志不再打印时，用浏览器访问`localhost:8080`即可进入Skywalking首页

![image-20211126134228596](https://file.iamwx.cn/images/202204121751624.png)

目前无服务注册，所以没有数据

![image-20211126134258026](https://file.iamwx.cn/images/202204121752084.png)

## 三、开发环境使用Idea配置Skywalking

在Idea你的项目中，打开`Edit Configurations`，把要在Skywalking中追踪的服务，配置一下Environment

![image-20211126135450572](https://file.iamwx.cn/images/202204121752283.png)

配置位置

![image-20211126140056664](https://file.iamwx.cn/images/202204121753834.png)

配置内容如下

```shell
-javaagent:/Java/seaat-cloud/third-party/skywalking-agent/agent/skywalking-agent.jar -Dskywalking.agent.service_name=seaat-gateway-server -Dskywalking.collector.backend_service=127.0.0.1:11800
```

-javaagent: 项目中 skywalking-agent.jar 的绝对路径，修改为自己的地址  

-Dskywalking.agent.service_name：服务名称 

-Dskywalking.collector.backend_service：Skywalking 服务地址

配置完成后，重启你的微服务，在日志的一开始会打印如下内容，意思是加载了Skywalking的Agent

![image-20211126140509030](https://file.iamwx.cn/images/202111261405071.png)

启动完成后，调用接口，即可在Skywalking看到追踪记录

![image-20211126142733212](https://file.iamwx.cn/images/202111261427247.png)

![image-20211126144851217](https://file.iamwx.cn/images/202111261448240.png)

![image-20211126144929450](https://file.iamwx.cn/images/202111261449476.png)

## 四、使用Skywalking的日志采集

在项目中引入依赖

```xml
<!-- Sky walking 日志收集, 版本号要和当前使用的Skywalking保持一直 -->
<dependency>
  <groupId>org.apache.skywalking</groupId>
  <artifactId>apm-toolkit-logback-1.x</artifactId>
  <version>8.7.0</version>
</dependency>
```

在`logback-spring.xml`中增加配置

```xml
<appender name="SKY_WALKING_LOG" class="org.apache.skywalking.apm.toolkit.log.logback.v1.x.log.GRPCLogClientAppender">
        <!-- 日志输出编码，own-pattern 为自己定义的日志打印格式  -->
        <encoder>
            <pattern>${own-pattern}</pattern>
        </encoder>
    </appender>

<root level="info">
    <appender-ref ref="SKY_WALKING_LOG"/>
</root>
```

再进行重启项目后，访问接口，即可在Skywalking的日志中看到访问的日志了

![image-20211126144836113](https://file.iamwx.cn/images/202111261448154.png)