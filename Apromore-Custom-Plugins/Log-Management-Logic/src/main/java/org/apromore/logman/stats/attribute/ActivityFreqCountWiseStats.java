package org.apromore.logman.stats.attribute;

import java.util.IntSummaryStatistics;

import org.apromore.logman.LogManager;
import org.apromore.logman.event.LogFilteredEvent;
import org.apromore.logman.log.activityaware.Activity;
import org.apromore.logman.stats.StatsCollector;
import org.apromore.logman.utils.LogUtils;
import org.eclipse.collections.impl.map.mutable.primitive.ObjectIntHashMap;

public class ActivityFreqCountWiseStats extends StatsCollector {
	private ObjectIntHashMap<String> actCountMap;
	
	public ActivityFreqCountWiseStats() {
		actCountMap = new ObjectIntHashMap<>();
	}
	
	public int getCount(String actName) {
		return actCountMap.get(actName);
	}
	
	public double getRelativeFrequency(String actName) {
		return actCountMap.get(actName)/actCountMap.sum();
	}
	
	public IntSummaryStatistics getSummaryStatistics() {
		return actCountMap.summaryStatistics();
	}
	
	///////////////////////// Collect statistics the first time //////////////////////////////
	
	@Override
	public void startVisit(LogManager logManager) {
		actCountMap.clear();
	}
	
    @Override
    public void visitActivity(Activity act) {
        actCountMap.addToValue(LogUtils.getConceptName(act), 1);
    }
    
    ///////////////////////// Update statistics //////////////////////////////    
    
    @Override
    public void onLogFiltered(LogFilteredEvent event) {
        for (Activity act : event.getAllDeletedActs()) {
        	actCountMap.addToValue(LogUtils.getConceptName(act), -1);
        }
    }
}
