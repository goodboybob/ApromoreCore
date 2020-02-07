package org.apromore.cache.ehcache;

import com.carrotsearch.junitbenchmarks.BenchmarkOptions;
import com.carrotsearch.junitbenchmarks.BenchmarkRule;
import org.apromore.apmlog.APMLog;
import org.deckfour.xes.factory.XFactory;
import org.deckfour.xes.factory.XFactoryRegistry;
import org.deckfour.xes.in.XesXmlParser;
import org.deckfour.xes.model.XLog;
import org.deckfour.xes.util.XTimer;
import org.ehcache.Cache;
import org.ehcache.CacheManager;
import org.ehcache.config.CacheConfiguration;
import org.ehcache.config.builders.CacheConfigurationBuilder;
import org.ehcache.config.builders.CacheManagerBuilder;
import org.ehcache.config.builders.ResourcePoolsBuilder;
import org.ehcache.config.units.MemoryUnit;
import org.ehcache.core.spi.service.StatisticsService;
import org.ehcache.core.statistics.CacheStatistics;
import org.ehcache.core.statistics.DefaultStatisticsService;
import org.ehcache.impl.config.persistence.CacheManagerPersistenceConfiguration;
import org.junit.Before;
import org.junit.BeforeClass;
import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TestRule;

import java.io.File;
import java.io.FileInputStream;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.zip.GZIPInputStream;

import static org.hamcrest.Matchers.is;
import static org.junit.Assert.assertThat;

public class PersistentPerformanceTest {

    private int excutionTime = 20;
    private ArrayList importTime = new ArrayList<Long>();
    private ArrayList cacheTime = new ArrayList<Long>();
    private ArrayList recoverTime = new ArrayList<Long>();
    private static final String PERSISTENCE_PATH = "/Users/frank/terracotta1";
    private static final String logName = "BPI_Challenge_2017.xes.gz";
    private static List<XLog> parsedLog = null;
    private static XLog xLog;
    //        APMLog apmLog;
    private XTimer timer = new XTimer();


        CacheConfiguration<Long, XLog> cacheConfig =
                CacheConfigurationBuilder.newCacheConfigurationBuilder(
                        Long.class, XLog.class,
                        ResourcePoolsBuilder.heap(1).disk(10000, MemoryUnit.MB, true))
                        .withValueSerializer(EhcacheXLogSerializer.class)
                        .build();

        CacheConfiguration<Long, APMLog> apmCacheConfig =
                CacheConfigurationBuilder.newCacheConfigurationBuilder(
                        Long.class, APMLog.class,
                        ResourcePoolsBuilder.heap(1).disk(10000, MemoryUnit.MB, true))
                        .withValueSerializer(APMLogKryoSerializer.class)
                        .build();

        StatisticsService statisticsService = new DefaultStatisticsService();

        CacheManager cacheManager = CacheManagerBuilder.newCacheManagerBuilder()
                .with(new CacheManagerPersistenceConfiguration(new File(PERSISTENCE_PATH)))
                .withCache("xLogCache", cacheConfig)
//                .withCache("apmLogCache", apmCacheConfig)
                .using(statisticsService)
                .build(true);

    Cache<Long, XLog> xLogCache = cacheManager.getCache("xLogCache", Long.class, XLog.class);

    public void importXLog(int i) {

//        Cache<Long, APMLog> apmLogCache = cacheManager.getCache("apmLogCache", Long.class, APMLog.class);

        XFactory factory = XFactoryRegistry.instance().currentDefault();
        XesXmlParser parser = new XesXmlParser(factory);

        try {
            String mainPath = Paths.get(ClassLoader.getSystemResource("XES_logs").toURI()).toString();
            Path lgPath =  Paths.get(mainPath ,logName);
            parsedLog = parser.parse(new GZIPInputStream(new FileInputStream(lgPath.toFile())));
//            Path lgPath =  Paths.get(mainPath ,"SepsisCases.xes");
//            parsedLog = parser.parse(new FileInputStream(lgPath.toFile()));
        } catch (Exception e) {
            e.printStackTrace();
        }
        xLog = parsedLog.iterator().next();
//        apmLog = new APMLog(xLog);


        timer.stop();
        importTime.add(timer.getDuration());
        System.out.println("Imported log:");
        System.out.println("Duration: " + timer.getDurationString());
    }

    public void cacheXLog(int i) {
        timer.start();
        xLogCache.put(Long.valueOf(i), xLog);
//        apmLogCache.put(1L, apmLog);

        timer.stop();
        cacheTime.add(timer.getDuration());
        System.out.println("Cached log:");
        System.out.println("Duration: " + timer.getDurationString());

//        XLog newEmp = xLogCache.get(1L);
//        assertThat(newEmp, is(xLog));

//        APMLog newAPM = apmLogCache.get(1L);
//        assertThat(newAPM.getTraceList().size(), is(apmLog.getTraceList().size()));

//        cacheManager.close();
    }


    public void GetFromCache(int i) {

//        cacheManager.init();
//        xLogCache = cacheManager.getCache("xLogCache", Long.class, XLog.class);
//        apmLogCache = cacheManager.getCache("apmLogCache", Long.class, APMLog.class);

        CacheStatistics ehCacheStat = statisticsService.getCacheStatistics("xLogCache");


        timer.start();
        XLog recoveredXLog = xLogCache.get(Long.valueOf(i));
//        APMLog recoveredAPMLog = apmLogCache.get(1L);
        timer.stop();
        recoverTime.add(timer.getDuration());
        System.out.println("Recovered log:");
        System.out.println("Duration: " + timer.getDurationString());

        // We rely here on the alphabetical order matching the depth order so from highest to lowest we have
        // OnHeap, OffHeap, Disk, Clustered
        System.out.println("OnHeap cache size: " + ehCacheStat.getTierStatistics().get("OnHeap").getOccupiedByteSize());
        System.out.println("OnDisk cache size: " + ehCacheStat.getTierStatistics().get("Disk").getOccupiedByteSize());

        assertThat(recoveredXLog, is(xLog));
    }

    @Rule
    public TestRule benchmarkRun = new BenchmarkRule();

    @BenchmarkOptions(benchmarkRounds = 1, warmupRounds = 0)
    @Test
    public void runTest() {

        for (int i = 1; i < excutionTime + 1; i++) {
            importXLog(i);
            cacheXLog(i);
            GetFromCache(i);
        }

        System.out.println("-----------------------------------------------------------------");
        System.out.println("Test Log: " + logName);
        System.out.println("Test measured " + excutionTime + " rounds");
        System.out.println("-----------------------------------------------------------------");
        System.out.printf("%30s %20s", "TASK", "AVERAGE DURATION");
        System.out.println();
        System.out.println("-----------------------------------------------------------------");
        System.out.println();
        System.out.format("%30s %20s",
                "Read XLog from XML:", String.format("%.2f", average(importTime)));
        System.out.println();
        System.out.format("%30s %20s",
                "Put XLog to cache:", String.format("%.2f", average(cacheTime)));
        System.out.println();
        System.out.format("%30s %20s",
                "Recover XLog from cache:", String.format("%.2f", average(recoverTime)));
        System.out.println();
        System.out.println("-----------------------------------------------------------------");


    }

    public double average(List<Long> list) {
        // 'average' is undefined if there are no elements in the list.
        if (list == null || list.isEmpty())
            return 0.0;
        // Calculate the summation of the elements in the list
        long sum = 0;
        int n = list.size();
        // Iterating manually is faster than using an enhanced for loop.
        for (int i = 0; i < n; i++)
            sum += list.get(i);
        // We don't want to perform an integer division, so the cast is mandatory.
        return ((double) sum)/n/1000;
    }


}